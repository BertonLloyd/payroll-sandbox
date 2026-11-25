// 薪酬结构 repository
import { BaseRepository } from './BaseRepository';
import { COLLECTIONS } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import type { PayStructure } from '../types';

export class StructureRepository extends BaseRepository<PayStructure> {
  constructor(sm: StorageManager) {
    super(sm, COLLECTIONS.structures);
  }

  async listActive(): Promise<PayStructure[]> {
    return (await this.list()).filter((s) => s.status === 'active');
  }
}
