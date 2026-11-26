// 启动迁移：为旧数据补全 schemeId，统一归入默认方案；幂等，重复执行无副作用
import { getStorageManager } from '../storage/factory';
import { COLLECTIONS } from '../storage/collections';
import type {
  Employee,
  MonthlyInput,
  PayComponent,
  PaySlip,
  PayStructure,
  Scheme,
} from '../types';
import { CUSTOM_TEMPLATE_ID } from '../types';
import { uid } from '../lib/id';

const DEFAULT_SCHEME_NAME = '我的方案';

interface ScopedEntity {
  id: string;
  schemeId?: string;
}

// 本地整集合迁移：缺 schemeId 的补默认值，返回是否有变更
async function migrateLocalCollection<T extends ScopedEntity>(
  collection: string,
  defaultSchemeId: string,
): Promise<boolean> {
  const sm = getStorageManager();
  const items = (await sm.getCollection<T[]>(collection as never)) ?? [];
  let changed = false;
  const next = items.map((it) => {
    if (!it.schemeId) {
      changed = true;
      return { ...it, schemeId: defaultSchemeId };
    }
    return it;
  });
  if (changed) await sm.setCollection(collection as never, next);
  return changed;
}

// IndexedDB 分片迁移：遍历分片键，逐条补全
async function migrateShardedCollection(
  collection: string,
  defaultSchemeId: string,
): Promise<boolean> {
  const sm = getStorageManager();
  const keys = await sm.listShardKeys(collection as never);
  let changed = false;
  for (const key of keys) {
    const items =
      (await sm.getKey<ScopedEntity[]>(collection as never, key)) ?? [];
    let keyChanged = false;
    const next = items.map((it) => {
      if (!it.schemeId) {
        keyChanged = true;
        return { ...it, schemeId: defaultSchemeId };
      }
      return it;
    });
    if (keyChanged) {
      changed = true;
      await sm.setKey(collection as never, key, next);
    }
  }
  return changed;
}

// 判断本地集合是否存在无 schemeId 的记录
async function hasLegacyLocal(collection: string): Promise<boolean> {
  const sm = getStorageManager();
  const items =
    (await sm.getCollection<ScopedEntity[]>(collection as never)) ?? [];
  return items.some((it) => !it.schemeId);
}

// 判断分片集合是否存在无 schemeId 的记录
async function hasLegacySharded(collection: string): Promise<boolean> {
  const sm = getStorageManager();
  const keys = await sm.listShardKeys(collection as never);
  for (const key of keys) {
    const items =
      (await sm.getKey<ScopedEntity[]>(collection as never, key)) ?? [];
    if (items.some((it) => !it.schemeId)) return true;
  }
  return false;
}

export async function runMigrations(): Promise<void> {
  const sm = getStorageManager();

  const localCollections = [
    COLLECTIONS.components,
    COLLECTIONS.structures,
    COLLECTIONS.employees,
  ];
  const shardedCollections = [
    COLLECTIONS.paySlips,
    COLLECTIONS.monthlyInputs,
  ];

  const legacyLocal = (
    await Promise.all(localCollections.map(hasLegacyLocal))
  ).some(Boolean);
  const legacySharded = (
    await Promise.all(shardedCollections.map(hasLegacySharded))
  ).some(Boolean);

  if (!legacyLocal && !legacySharded) return;

  // 存在旧数据：确保有默认方案
  let schemes =
    (await sm.getCollection<Scheme[]>(COLLECTIONS.schemes)) ?? [];
  let defaultScheme = schemes[0];
  if (!defaultScheme) {
    const now = Date.now();
    defaultScheme = {
      id: uid(),
      name: DEFAULT_SCHEME_NAME,
      templateId: CUSTOM_TEMPLATE_ID,
      createdAt: now,
      updatedAt: now,
      deleted: false,
      deletedAt: null,
    };
    schemes = [defaultScheme];
    await sm.setCollection(COLLECTIONS.schemes, schemes);
  }

  await Promise.all(
    localCollections.map((c) =>
      migrateLocalCollection<
        PayComponent | PayStructure | Employee
      >(c, defaultScheme!.id),
    ),
  );
  await Promise.all(
    shardedCollections.map((c) =>
      migrateShardedCollection(c, defaultScheme!.id),
    ),
  );
}
