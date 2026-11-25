// 薪酬模板 repository
import { BaseRepository } from './BaseRepository';
import { COLLECTIONS } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import type { PayTemplate, TemplateCategory } from '../types';

export class TemplateRepository extends BaseRepository<PayTemplate> {
  constructor(sm: StorageManager) {
    super(sm, COLLECTIONS.templates);
  }

  async findByCategory(
    category: TemplateCategory,
  ): Promise<PayTemplate | null> {
    return (await this.list()).find((t) => t.category === category) ?? null;
  }
}
