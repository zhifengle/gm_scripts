import { STORES } from './constants';
import { IndexedDatabase } from './db';
import {
  AuthorStats,
  ClearAuthorRecordsResult,
  ReplyRecord,
  SaveRecordsResult,
  ThreadMeta,
} from './types';
import { finalizeRecord, getAuthorKey, normalizeText } from './utils';

function compareRecords(a: ReplyRecord, b: ReplyRecord) {
  const timeCompare = String(a['发帖时间'] || '').localeCompare(String(b['发帖时间'] || ''));
  if (timeCompare) return timeCompare;
  const floorCompare = String(a.floor || '').localeCompare(String(b.floor || ''), undefined, { numeric: true });
  if (floorCompare) return floorCompare;
  return String(a.pid || '').localeCompare(String(b.pid || ''), undefined, { numeric: true });
}

function compareThreads(a: ThreadMeta, b: ThreadMeta) {
  return String(b.lastCollectedAt || '').localeCompare(String(a.lastCollectedAt || ''));
}

function compareAuthors(a: AuthorStats, b: AuthorStats) {
  const replyCompare = Number(b.replyCount || 0) - Number(a.replyCount || 0);
  if (replyCompare) return replyCompare;
  return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
}

function buildThreadMeta(records: ReplyRecord[]): ThreadMeta {
  const first = records[0];
  const pages = new Set(records.map((record) => record.page).filter(Boolean));
  const authors = new Set(records.map((record) => record.authorKey).filter(Boolean));
  const collectedTimes = records.map((record) => record['采集时间']).filter(Boolean).sort();
  const pagesCollected = Array.from(pages).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  return {
    siteKey: first?.siteKey || '',
    threadKey: first?.threadKey || '',
    threadId: first?.threadId || '',
    threadTitle: first?.threadTitle || '',
    forumName: first?.forumName || '',
    sourceUrl: first?.['来源URL'] || '',
    firstCollectedAt: collectedTimes[0] || '',
    lastCollectedAt: collectedTimes[collectedTimes.length - 1] || '',
    pageCountCollected: pages.size,
    pagesCollected,
    lastPage: pagesCollected[pagesCollected.length - 1] || '',
    replyCount: records.length,
    authorCount: authors.size,
  };
}

function buildAuthorStats(records: ReplyRecord[]): AuthorStats[] {
  type MutableAuthorStats = Omit<AuthorStats, 'threadIds' | 'threadKeys' | 'threadCount'> & {
    threadIds: Set<string>;
    threadKeys: Set<string>;
  };
  const authorMap = new Map<string, MutableAuthorStats>();

  for (const record of records) {
    const authorKey = record.authorKey || getAuthorKey(record);
    if (!authorKey || authorKey === 'unknown') continue;

    if (!authorMap.has(authorKey)) {
      authorMap.set(authorKey, {
        siteKey: record.siteKey || '',
        authorKey,
        uid: record.uid || '',
        authorName: record['作者name'] || '',
        replyCount: 0,
        threadIds: new Set<string>(),
        threadKeys: new Set<string>(),
        firstSeenAt: record['采集时间'] || '',
        lastSeenAt: record['采集时间'] || '',
      });
    }

    const stat = authorMap.get(authorKey)!;
    stat.replyCount += 1;
    if (record.threadId) stat.threadIds.add(record.threadId);
    if (record.threadKey) stat.threadKeys.add(record.threadKey);
    if (record.uid && !stat.uid) stat.uid = record.uid;
    if (record['作者name'] && !stat.authorName) stat.authorName = record['作者name'];
    if (record['采集时间'] && (!stat.firstSeenAt || record['采集时间'] < stat.firstSeenAt)) stat.firstSeenAt = record['采集时间'];
    if (record['采集时间'] && (!stat.lastSeenAt || record['采集时间'] > stat.lastSeenAt)) stat.lastSeenAt = record['采集时间'];
  }

  return Array.from(authorMap.values()).map((stat) => ({
    ...stat,
    threadCount: stat.threadKeys.size,
    threadIds: Array.from(stat.threadIds),
    threadKeys: Array.from(stat.threadKeys),
  }));
}

function uniqueRecords(records: ReplyRecord[]) {
  const seenKeys = new Set<string>();
  return records.filter((record) => {
    const key = record?._key;
    if (!key || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

function affectedAuthorKeys(records: ReplyRecord[]) {
  return Array.from(new Set(records.map((record) => record.authorKey || getAuthorKey(record)).filter(Boolean)));
}

export class ReplyRepository {
  constructor(private readonly db: IndexedDatabase) {}

  async readAllRecords() {
    const records = await this.db.getAll<ReplyRecord>(STORES.replies);
    return records.sort(compareRecords);
  }

  async readRecordsByThread(threadKey: string) {
    if (!threadKey) return [];
    const records = await this.db.getAllFromIndex<ReplyRecord>(STORES.replies, 'threadKey', IDBKeyRange.only(threadKey));
    return records.sort(compareRecords);
  }

  async readThreads() {
    const threads = await this.db.getAll<ThreadMeta>(STORES.threads);
    return threads.sort(compareThreads);
  }

  async readAuthors() {
    const authors = await this.db.getAll<AuthorStats>(STORES.authors);
    return authors.sort(compareAuthors);
  }

  async readRecordsByAuthorKey(authorKey: string) {
    if (!authorKey) return [];
    const indexedRecords = await this.db.getAllFromIndex<ReplyRecord>(STORES.replies, 'authorKey', IDBKeyRange.only(authorKey));
    let legacyRecords: ReplyRecord[] = [];
    const uidMatch = authorKey.match(/^[^:]+:uid:(.+)$/);
    if (uidMatch) {
      const uid = uidMatch[1];
      if (uid) legacyRecords = await this.db.getAllFromIndex<ReplyRecord>(STORES.replies, 'uid', IDBKeyRange.only(uid));
    }
    return uniqueRecords([...indexedRecords, ...legacyRecords])
      .filter((record) => (record.authorKey || getAuthorKey(record)) === authorKey)
      .sort(compareRecords);
  }

  async readRecordsByAuthorQuery(query: string) {
    const normalizedQuery = normalizeText(query).toLowerCase();
    if (!normalizedQuery) return [];
    const records = await this.readAllRecords();
    return records.filter((record) => {
      const authorKey = String(record.authorKey || '').toLowerCase();
      const uid = String(record.uid || '').toLowerCase();
      const authorName = String(record['作者name'] || '').toLowerCase();
      return authorKey === normalizedQuery || uid.includes(normalizedQuery) || authorName.includes(normalizedQuery);
    });
  }

  async readRecordsByExactAuthorQuery(query: string) {
    const normalizedQuery = normalizeText(query);
    const queryLower = normalizedQuery.toLowerCase();
    if (!queryLower) return [];
    const records = await this.readAllRecords();
    return records.filter((record) => {
      const authorKey = String(record.authorKey || '').toLowerCase();
      const uid = String(record.uid || '').toLowerCase();
      const authorName = String(record['作者name'] || '').toLowerCase();
      return authorKey === queryLower || uid === queryLower || authorName === queryLower;
    });
  }

  async saveRecords(rows: ReplyRecord[]): Promise<SaveRecordsResult> {
    const normalizedRows = rows.map((row) => finalizeRecord({ ...row }));
    const threadKey = normalizedRows[0]?.threadKey || '';
    const overwrittenRecords = await this.db.getMany<ReplyRecord>(
      STORES.replies,
      normalizedRows.map((row) => row._key)
    );
    const overwrittenKeys = new Set(overwrittenRecords.map((record) => record._key));
    const authorKeys = affectedAuthorKeys([...normalizedRows, ...overwrittenRecords]);

    await this.db.putMany(STORES.replies, normalizedRows);
    await this.rebuildThreadMeta(threadKey);
    await this.rebuildAuthorStatsByKeys(authorKeys);

    const added = normalizedRows.filter((row) => !overwrittenKeys.has(row._key)).length;
    const currentThreadTotal = (await this.readRecordsByThread(threadKey)).length;
    const total = await this.db.count(STORES.replies);
    return { added, currentThreadTotal, total };
  }

  async importRecords(rows: ReplyRecord[]): Promise<number> {
    const normalizedRows = rows.map((row) => finalizeRecord(row));
    if (!normalizedRows.length) return 0;
    await this.db.putMany(STORES.replies, normalizedRows);
    await this.rebuildThreadMetas(Array.from(new Set(normalizedRows.map((record) => record.threadKey).filter(Boolean))));
    await this.rebuildAuthorStatsByKeys(affectedAuthorKeys(normalizedRows));
    return normalizedRows.length;
  }

  async normalizeStoredRecords(): Promise<number> {
    const records = await this.readAllRecords();
    if (!records.length) return 0;

    const originalKeys = records.map((record) => record._key);
    const normalizedRecords = records.map((record) => finalizeRecord({ ...record }));
    const changedKeys = records
      .map((_record, index) => (originalKeys[index] !== normalizedRecords[index]._key ? originalKeys[index] : ''))
      .filter(Boolean);

    await this.db.deleteMany(STORES.replies, changedKeys);
    await this.db.clearStores([STORES.threads, STORES.authors]);
    await this.importRecords(normalizedRecords);
    return normalizedRecords.length;
  }

  async clearAllRecords() {
    await this.db.clearStores([STORES.replies, STORES.threads, STORES.authors]);
  }

  async clearCurrentThreadRecords(threadKey: string) {
    const records = await this.readRecordsByThread(threadKey);
    const authorKeys = affectedAuthorKeys(records);
    await this.db.deleteMany(STORES.replies, records.map((record) => record._key));
    await this.db.deleteMany(STORES.threads, [threadKey]);
    await this.rebuildAuthorStatsByKeys(authorKeys);
    return records.length;
  }

  summarizeAuthorsFromRecords(records: ReplyRecord[]) {
    return buildAuthorStats(records).sort(compareAuthors);
  }

  async clearAuthorRecords(query: string): Promise<ClearAuthorRecordsResult> {
    const records = await this.readRecordsByExactAuthorQuery(query);
    const keys = Array.from(new Set(records.map((record) => record._key).filter(Boolean)));
    const threadKeys = Array.from(new Set(records.map((record) => record.threadKey).filter(Boolean)));
    const authors = this.summarizeAuthorsFromRecords(records);
    const authorKeys = affectedAuthorKeys(records);

    await this.db.deleteMany(STORES.replies, keys);
    await this.rebuildThreadMetas(threadKeys);
    await this.rebuildAuthorStatsByKeys(authorKeys);
    return { deleted: keys.length, threadCount: threadKeys.length, authors };
  }

  async searchRecords(keyword: string) {
    const normalizedKeyword = normalizeText(keyword).toLowerCase();
    if (!normalizedKeyword) return [];
    const records = await this.readAllRecords();
    return records.filter((record) =>
      ['threadTitle', 'forumName', '作者name', 'uid', '发帖时间', '回复内容', '引用内容', '回复全文'].some((key) =>
        String(record[key] || '').toLowerCase().includes(normalizedKeyword)
      )
    );
  }

  async rebuildAllDerivedData() {
    const records = await this.readAllRecords();
    await this.rebuildThreadMetas(Array.from(new Set(records.map((record) => record.threadKey).filter(Boolean))));
    await this.rebuildAuthorStatsByKeys(affectedAuthorKeys(records));
  }

  private async rebuildThreadMeta(threadKey: string) {
    const records = await this.readRecordsByThread(threadKey);
    if (!records.length) return;
    await this.db.put(STORES.threads, buildThreadMeta(records));
  }

  private async rebuildThreadMetas(threadKeys: string[]) {
    for (const threadKey of Array.from(new Set(threadKeys)).filter(Boolean)) await this.rebuildThreadMeta(threadKey);
  }

  private async rebuildAuthorStatsByKeys(authorKeys: string[]) {
    const keys = Array.from(new Set(authorKeys.filter(Boolean)));
    const authorsToUpsert: AuthorStats[] = [];
    const authorsToDelete: string[] = [];

    for (const authorKey of keys) {
      const records = await this.readRecordsByAuthorKey(authorKey);
      const authorStats = buildAuthorStats(records);
      if (authorStats[0]) authorsToUpsert.push(authorStats[0]);
      else authorsToDelete.push(authorKey);
    }

    await this.db.putMany(STORES.authors, authorsToUpsert);
    await this.db.deleteMany(STORES.authors, authorsToDelete);
  }
}
