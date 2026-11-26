// localStorage 适配器：同步引擎包装为统一异步接口，配额超限显式报错，不静默
import type { StorageAdapter } from './StorageAdapter';
import { StorageQuotaError, StorageAccessError } from './errors';

export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'localStorage';

  constructor(private readonly prefix: string) {}

  private fullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.fullKey(key));
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (e) {
      throw new StorageAccessError(`读取失败：${key}`, e);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (e) {
      throw new StorageAccessError(`数据无法序列化：${key}`, e);
    }
    try {
      localStorage.setItem(this.fullKey(key), serialized);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        throw new StorageQuotaError(key, e);
      }
      throw new StorageAccessError(`写入失败：${key}`, e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.fullKey(key));
    } catch (e) {
      throw new StorageAccessError(`删除失败：${key}`, e);
    }
  }

  async clear(prefix?: string): Promise<void> {
    const match = `${this.prefix}${prefix ?? ''}`;
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(match)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  }

  async keys(prefix?: string): Promise<string[]> {
    const match = `${this.prefix}${prefix ?? ''}`;
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(match)) result.push(k.slice(this.prefix.length));
    }
    return result;
  }
}
