// 统一存储管理器：按集合路由到 localStorage 或 IndexedDB，上层只面向集合/键
import type { StorageAdapter } from './StorageAdapter';
import {
  COLLECTIONS,
  isLocalCollection,
  type CollectionName,
} from './collections';

export class StorageManager {
  constructor(
    private readonly local: StorageAdapter,
    private readonly idb: StorageAdapter,
  ) {}

  private pick(collection: CollectionName): StorageAdapter {
    return isLocalCollection(collection) ? this.local : this.idb;
  }

  // 集合级读写（配置类，整集合一个键）
  getCollection<T>(collection: CollectionName): Promise<T | null> {
    return this.pick(collection).get<T>(collection);
  }

  setCollection<T>(collection: CollectionName, value: T): Promise<void> {
    return this.pick(collection).set(collection, value);
  }

  // 分片/通用键读写（工资条、外部输入按 年-月 分键）
  getKey<T>(collection: CollectionName, key: string): Promise<T | null> {
    return this.pick(collection).get<T>(key);
  }

  setKey<T>(collection: CollectionName, key: string, value: T): Promise<void> {
    return this.pick(collection).set(key, value);
  }

  removeKey(collection: CollectionName, key: string): Promise<void> {
    return this.pick(collection).remove(key);
  }

  listShardKeys(collection: CollectionName): Promise<string[]> {
    return this.pick(collection).keys(`${collection}/`);
  }

  clearCollection(collection: CollectionName): Promise<void> {
    return this.pick(collection).clear(collection);
  }

  // 全量导出：遍历两个引擎的全部键（去掉前缀后的逻辑键）
  async exportAll(): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    for (const engine of [this.local, this.idb]) {
      for (const key of await engine.keys()) {
        out[key] = await engine.get(key);
      }
    }
    return out;
  }

  // 全量导入：按逻辑键首段路由到对应引擎
  async importAll(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      const root = key.split('/')[0] as CollectionName;
      await this.pick(root).set(key, value);
    }
  }
}

export { COLLECTIONS };
