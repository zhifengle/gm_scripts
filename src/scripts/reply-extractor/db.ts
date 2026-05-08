import { DB_VERSION, STORES } from './constants';

type StoreName = (typeof STORES)[keyof typeof STORES];
type IndexSchema = {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};
type StoreSchema = {
  keyPath: string;
  indexes: IndexSchema[];
};
type DatabaseSchema = Record<StoreName, StoreSchema>;

const DB_SCHEMA: DatabaseSchema = {
  [STORES.replies]: {
    keyPath: '_key',
    indexes: [
      { name: 'siteKey', keyPath: 'siteKey', options: { unique: false } },
      { name: 'threadKey', keyPath: 'threadKey', options: { unique: false } },
      { name: 'threadId', keyPath: 'threadId', options: { unique: false } },
      { name: 'uid', keyPath: 'uid', options: { unique: false } },
      { name: 'authorKey', keyPath: 'authorKey', options: { unique: false } },
      { name: 'postTime', keyPath: '发帖时间', options: { unique: false } },
      { name: 'pid', keyPath: 'pid', options: { unique: false } },
      { name: 'floor', keyPath: 'floor', options: { unique: false } },
      { name: 'collectedAt', keyPath: '采集时间', options: { unique: false } },
      { name: 'threadId_uid', keyPath: ['threadId', 'uid'], options: { unique: false } },
      { name: 'threadId_postTime', keyPath: ['threadId', '发帖时间'], options: { unique: false } },
      { name: 'threadKey_uid', keyPath: ['threadKey', 'uid'], options: { unique: false } },
      { name: 'threadKey_postTime', keyPath: ['threadKey', '发帖时间'], options: { unique: false } },
    ],
  },
  [STORES.threads]: {
    keyPath: 'threadKey',
    indexes: [
      { name: 'siteKey', keyPath: 'siteKey', options: { unique: false } },
      { name: 'threadId', keyPath: 'threadId', options: { unique: false } },
      { name: 'forumName', keyPath: 'forumName', options: { unique: false } },
      { name: 'threadTitle', keyPath: 'threadTitle', options: { unique: false } },
      { name: 'lastCollectedAt', keyPath: 'lastCollectedAt', options: { unique: false } },
      { name: 'replyCount', keyPath: 'replyCount', options: { unique: false } },
    ],
  },
  [STORES.authors]: {
    keyPath: 'authorKey',
    indexes: [
      { name: 'siteKey', keyPath: 'siteKey', options: { unique: false } },
      { name: 'uid', keyPath: 'uid', options: { unique: false } },
      { name: 'authorName', keyPath: 'authorName', options: { unique: false } },
      { name: 'replyCount', keyPath: 'replyCount', options: { unique: false } },
      { name: 'threadCount', keyPath: 'threadCount', options: { unique: false } },
      { name: 'lastSeenAt', keyPath: 'lastSeenAt', options: { unique: false } },
    ],
  },
};

function stopWithMessage(message: string): never {
  alert(message);
  throw new Error(message);
}

export function ensureIndexedDbSupported() {
  if (!window.indexedDB) stopWithMessage('当前浏览器不支持 IndexedDB，无法记录回复。');
}

export class IndexedDatabase {
  private db: IDBDatabase | null = null;
  private openingPromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly name: string) {}

  async put<T>(storeName: StoreName, value: T): Promise<IDBValidKey> {
    const db = await this.open();
    const tx = db.transaction(storeName, 'readwrite');
    const key = await this.requestToPromise<IDBValidKey>(
      tx.objectStore(storeName).put(value),
      `put:${storeName}`
    );
    await this.transactionDone(tx, `put:${storeName}`);
    return key;
  }

  async putMany<T>(storeName: StoreName, values: T[]) {
    if (!values.length) return;
    const db = await this.open();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    try {
      for (const value of values) store.put(value);
    } catch (error) {
      throw this.withContext(error, `putMany:${storeName}`);
    }
    await this.transactionDone(tx, `putMany:${storeName}`);
  }

  async deleteMany(storeName: StoreName, keys: IDBValidKey[]) {
    if (!keys.length) return;
    const db = await this.open();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    try {
      for (const key of keys) store.delete(key);
    } catch (error) {
      throw this.withContext(error, `deleteMany:${storeName}`);
    }
    await this.transactionDone(tx, `deleteMany:${storeName}`);
  }

  async getMany<T>(storeName: StoreName, keys: IDBValidKey[]): Promise<T[]> {
    const uniqueKeys = Array.from(new Set(keys.filter(Boolean)));
    if (!uniqueKeys.length) return [];
    const db = await this.open();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const results = await Promise.all(
      uniqueKeys.map((key) => this.requestToPromise<T | undefined>(store.get(key), `getMany:${storeName}`))
    );
    await this.transactionDone(tx, `getMany:${storeName}`);
    return results.filter(Boolean) as T[];
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.open();
    return this.requestToPromise<T[]>(
      db.transaction(storeName, 'readonly').objectStore(storeName).getAll(),
      `getAll:${storeName}`
    );
  }

  async getAllFromIndex<T>(storeName: StoreName, indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> {
    const db = await this.open();
    const index = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
    return this.requestToPromise<T[]>(index.getAll(query), `getAllFromIndex:${storeName}.${indexName}`);
  }

  async clearStores(storeNames: StoreName[]) {
    const db = await this.open();
    const tx = db.transaction(storeNames, 'readwrite');
    for (const storeName of storeNames) tx.objectStore(storeName).clear();
    await this.transactionDone(tx, `clearStores:${storeNames.join(',')}`);
  }

  async count(storeName: StoreName): Promise<number> {
    const db = await this.open();
    return this.requestToPromise<number>(
      db.transaction(storeName, 'readonly').objectStore(storeName).count(),
      `count:${storeName}`
    );
  }

  close() {
    if (!this.db) return;
    this.db.close();
    this.db = null;
    this.openingPromise = null;
  }

  private open(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.openingPromise) return this.openingPromise;

    this.openingPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, DB_VERSION);
      request.onupgradeneeded = () => this.ensureStores(request.result, request.transaction);
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => this.close();
        this.openingPromise = null;
        resolve(this.db);
      };
      request.onerror = () => {
        this.openingPromise = null;
        reject(this.withContext(request.error, 'open'));
      };
      request.onblocked = () => {
        this.openingPromise = null;
        reject(this.withContext(new Error('IndexedDB upgrade is blocked by another open connection'), 'open'));
      };
    });

    return this.openingPromise;
  }

  private ensureStores(db: IDBDatabase, transaction: IDBTransaction | null) {
    for (const [storeName, schema] of Object.entries(DB_SCHEMA) as [StoreName, StoreSchema][]) {
      const storeExists = db.objectStoreNames.contains(storeName);
      if (storeExists && !transaction) continue;
      let store: IDBObjectStore;
      if (storeExists) {
        store = transaction!.objectStore(storeName);
        if (String(store.keyPath) !== schema.keyPath) {
          db.deleteObjectStore(storeName);
          store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
        }
      } else {
        store = db.createObjectStore(storeName, { keyPath: schema.keyPath });
      }
      this.ensureIndexes(store, schema);
    }
  }

  private ensureIndexes(store: IDBObjectStore, schema: StoreSchema) {
    const expectedNames = new Set(schema.indexes.map((index) => index.name));
    for (const name of Array.from(store.indexNames)) {
      if (!expectedNames.has(name)) store.deleteIndex(name);
    }
    for (const index of schema.indexes) {
      if (store.indexNames.contains(index.name)) continue;
      store.createIndex(index.name, index.keyPath, index.options || {});
    }
  }

  private requestToPromise<T>(request: IDBRequest, operation: string): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(this.withContext(request.error, operation));
    });
  }

  private transactionDone(transaction: IDBTransaction, operation: string): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(this.withContext(transaction.error, operation));
      transaction.onabort = () => reject(this.withContext(transaction.error, operation));
    });
  }

  private withContext(error: unknown, operation: string): Error {
    const reason = error instanceof Error ? error : new Error(String(error || 'Unknown IndexedDB error'));
    const wrapped = new Error(`IndexedDatabase.${operation} failed (${this.name}): ${reason.message}`);
    wrapped.cause = reason;
    return wrapped;
  }
}
