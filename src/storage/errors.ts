// 存储错误类型：写入失败必须显式抛出，禁止静默吞掉

export class StorageQuotaError extends Error {
  readonly key: string;
  constructor(key: string, cause?: unknown) {
    super(`本地存储已满，无法写入「${key}」，请先导出备份或清理历史数据`);
    this.name = 'StorageQuotaError';
    this.key = key;
    if (cause) this.cause = cause;
  }
}

export class StorageAccessError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageAccessError';
    if (cause) this.cause = cause;
  }
}
