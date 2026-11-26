// 薪酬方案 repository：方案基础 CRUD；级联删除由 SchemeService 统一处理
import { BaseRepository } from './BaseRepository';
import { COLLECTIONS } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import type { Scheme } from '../types';

export class SchemeRepository extends BaseRepository<Scheme> {
  constructor(sm: StorageManager) {
    super(sm, COLLECTIONS.schemes);
  }

  async findByTemplate(templateId: string): Promise<Scheme[]> {
    return (await this.list()).filter((s) => s.templateId === templateId);
  }
}
