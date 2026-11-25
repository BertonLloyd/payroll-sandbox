// 个税社保参数包 repository
import { BaseRepository } from './BaseRepository';
import { COLLECTIONS } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import type { TaxParamPack } from '../types';

export class ParamPackRepository extends BaseRepository<TaxParamPack> {
  constructor(sm: StorageManager) {
    super(sm, COLLECTIONS.paramPacks);
  }

  async getDefault(): Promise<TaxParamPack | null> {
    return (await this.list()).find((p) => p.isDefault) ?? null;
  }
}
