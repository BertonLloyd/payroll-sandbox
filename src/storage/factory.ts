// 存储工厂：构建默认双引擎管理器（单例）
import { StorageManager } from './StorageManager';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { IndexedDbAdapter } from './IndexedDbAdapter';

const PREFIX = import.meta.env.VITE_STORAGE_PREFIX || 'payroll:';
const DB_NAME = 'payroll-sandbox-db';

let manager: StorageManager | null = null;

export function getStorageManager(): StorageManager {
  if (!manager) {
    manager = new StorageManager(
      new LocalStorageAdapter(PREFIX),
      new IndexedDbAdapter(DB_NAME),
    );
  }
  return manager;
}
