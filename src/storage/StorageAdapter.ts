// 统一存储适配器接口：localStorage 与 IndexedDB 实现同一契约，上层不感知具体引擎

export interface StorageAdapter {
  readonly name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

export interface CapacityEstimate {
  quota: number;
  available: number;
  usage: number;
  supported: boolean;
}
