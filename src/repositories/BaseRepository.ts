// 通用集合级 repository：封装 CRUD、软删回收站、审计字段；具体实体继承即可
import type { AuditFields } from '../types';
import type { CollectionName } from '../storage/collections';
import { StorageManager } from '../storage/StorageManager';
import { StorageAccessError } from '../storage/errors';
import { uid } from '../lib/id';

type CreateInput<T> = Omit<T, keyof AuditFields>;

export abstract class BaseRepository<T extends AuditFields> {
  constructor(
    protected readonly sm: StorageManager,
    protected readonly collection: CollectionName,
  ) {}

  protected async readAll(): Promise<T[]> {
    return (await this.sm.getCollection<T[]>(this.collection)) ?? [];
  }

  protected writeAll(items: T[]): Promise<void> {
    return this.sm.setCollection(this.collection, items);
  }

  list(): Promise<T[]> {
    return this.readAll().then((items) => items.filter((x) => !x.deleted));
  }

  listWithDeleted(): Promise<T[]> {
    return this.readAll();
  }

  async get(id: string): Promise<T | null> {
    return (await this.readAll()).find((x) => x.id === id) ?? null;
  }

  async create(input: CreateInput<T>): Promise<T> {
    const now = Date.now();
    const entity = {
      ...input,
      id: uid(),
      createdAt: now,
      updatedAt: now,
      deleted: false,
      deletedAt: null,
    } as T;
    const items = await this.readAll();
    items.push(entity);
    await this.writeAll(items);
    return entity;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const items = await this.readAll();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) throw new StorageAccessError(`记录不存在：${id}`);
    items[idx] = { ...items[idx], ...patch, updatedAt: Date.now() };
    await this.writeAll(items);
    return items[idx];
  }

  async softDelete(id: string): Promise<void> {
    await this.update(id, { deleted: true, deletedAt: Date.now() } as Partial<T>);
  }

  restore(id: string): Promise<T> {
    return this.update(id, {
      deleted: false,
      deletedAt: null,
    } as Partial<T>);
  }

  async hardDelete(id: string): Promise<void> {
    const items = await this.readAll();
    const next = items.filter((x) => x.id !== id);
    await this.writeAll(next);
  }
}
