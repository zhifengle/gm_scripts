import { STORES } from './constants';
import { ReplyRepository } from './repository';
import { ReplyRecord } from './types';
import { finalizeRecord, inferSiteKeyFromUrl } from './utils';

const LEGACY_MIGRATION_KEY_PREFIX = 'reply-extractor-legacy-migration-v3';
const LEGACY_DATABASES = [
  { name: 'nga-reply-extractor', siteKey: 'nga' },
  { name: 's1-reply-extractor', siteKey: 's1' },
] as const;

function requestToPromise<T>(request: IDBRequest<T>, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`${operation} failed: ${request.error?.message || request.error || 'unknown error'}`));
  });
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`open legacy database ${name} failed: ${request.error?.message || request.error || 'unknown error'}`));
    request.onblocked = () => reject(new Error(`open legacy database ${name} blocked`));
  });
}

async function readLegacyReplies(databaseName: string): Promise<Record<string, string | undefined>[]> {
  const db = await openDatabase(databaseName);
  try {
    if (!db.objectStoreNames.contains(STORES.replies)) return [];
    return await requestToPromise<Record<string, string | undefined>[]>(
      db.transaction(STORES.replies, 'readonly').objectStore(STORES.replies).getAll(),
      `read ${databaseName}.${STORES.replies}`
    );
  } finally {
    db.close();
  }
}

function getLegacySiteKey(record: Record<string, string | undefined>, fallbackSiteKey: string): string {
  if (record.siteKey) return record.siteKey;
  const legacySite = String(record.site || '').toLowerCase();
  if (legacySite === 'nga') return 'nga';
  if (legacySite === 's1') return 's1';
  return inferSiteKeyFromUrl(record['来源URL'] || '') || fallbackSiteKey;
}

function normalizeLegacyRecord(record: Record<string, string | undefined>, fallbackSiteKey: string): ReplyRecord | null {
  const siteKey = getLegacySiteKey(record, fallbackSiteKey);
  const threadId = record.threadId || '';
  if (!siteKey || !threadId) return null;

  return finalizeRecord({
    ...record,
    siteKey,
    threadKey: `${siteKey}:${threadId}`,
  });
}

function getCurrentSiteKey(): string {
  return inferSiteKeyFromUrl(location.href);
}

function getMigrationKey(databaseName: string): string {
  return `${LEGACY_MIGRATION_KEY_PREFIX}:${location.origin}:${databaseName}`;
}

export async function migrateLegacyIndexedDb(repository: ReplyRepository): Promise<number> {
  await repository.normalizeStoredRecords();

  const records: ReplyRecord[] = [];
  const completedMigrationKeys: string[] = [];
  let hasFailure = false;
  const currentSiteKey = getCurrentSiteKey();
  const legacyDatabases = LEGACY_DATABASES.filter((legacyDb) => legacyDb.siteKey === currentSiteKey);

  for (const legacyDb of legacyDatabases) {
    const migrationKey = getMigrationKey(legacyDb.name);
    if (GM_getValue(migrationKey, '') === 'done') continue;

    try {
      const legacyRecords = await readLegacyReplies(legacyDb.name);
      for (const record of legacyRecords) {
        const normalizedRecord = normalizeLegacyRecord(record, legacyDb.siteKey);
        if (normalizedRecord) records.push(normalizedRecord);
      }
      completedMigrationKeys.push(migrationKey);
    } catch (error) {
      hasFailure = true;
      console.error(error);
    }
  }

  const imported = await repository.importRecords(records);
  if (!hasFailure) completedMigrationKeys.forEach((migrationKey) => GM_setValue(migrationKey, 'done'));
  return imported;
}
