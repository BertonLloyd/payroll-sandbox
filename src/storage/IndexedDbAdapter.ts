// IndexedDB 适配器：大容量异步引擎，结构化克隆直接存对象，不阻塞主线程
import type { StorageAdapter } from './StorageAdapter';
import { StorageQuotaError, StorageAccessError } from './errors';

const STORE = 'kv';

interface KvRecord<T> {
  key: string;
  value: T;
}

export class IndexedDbAdapter implements StorageAdapter {
  readonly name = 'indexeddb';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly dbName: string,
    private readonly version: number = 1,
  ) {}

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () =>
        reject(new StorageAccessError('IndexedDB 打开失败', req.error));
    });
    return this.dbPromise;
  }

  private request<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return this.open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const tx = db.transaction(STORE, mode);
          const req = action(tx.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            const err = req.error;
            if (err && err.name === 'QuotaExceededError') {
              reject(new StorageQuotaError('(indexeddb)', err));
            } else {
              reject(new StorageAccessError('IndexedDB 操作失败', err));
            }
          };
        }),
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const record = await this.request<KvRecord<T> | undefined>(
      'readonly',
      (store) => store.get(key),
    );
    return record ? record.value : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.request('readwrite', (store) =>
      store.put({ key, value } satisfies KvRecord<T>),
    );
  }

  async remove(key: string): Promise<void> {
    await this.request('readwrite', (store) => store.delete(key));
  }

  async keys(prefix?: string): Promise<string[]> {
    const all = await this.request<IDBValidKey[]>(
      'readonly',
      (store) => store.getAllKeys(),
    );
    const keys = all.map((k) => String(k));
    return prefix ? keys.filter((k) => k.startsWith(prefix)) : keys;
  }

  async clear(prefix?: string): Promise<void> {
    const db = await this.open();
    const keys = await this.keys(prefix);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      keys.forEach((k) => store.delete(k));
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new StorageAccessError('IndexedDB 清理失败', tx.error));
    });
  }
}
