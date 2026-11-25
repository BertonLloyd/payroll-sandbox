// 薪酬组件 repository
import { BaseRepository } from './BaseRepository';
import { COLLECTIONS } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import type { Nature, PayComponent } from '../types';

export class ComponentRepository extends BaseRepository<PayComponent> {
  constructor(sm: StorageManager) {
    super(sm, COLLECTIONS.components);
  }

  async findByCode(code: string): Promise<PayComponent | null> {
    return (await this.list()).find((c) => c.code === code) ?? null;
  }

  async listByNature(nature: Nature): Promise<PayComponent[]> {
    return (await this.list()).filter((c) => c.nature === nature);
  }
}
