// 方案编排服务：创建（模板/空白）、重命名、级联删除、数据量统计
import { getStorageManager } from '../storage/factory';
import { COLLECTIONS } from '../storage/collections';
import type {
  Employee,
  MonthlyInput,
  PayComponent,
  PaySlip,
  PayStructure,
  PayTemplate,
  Scheme,
} from '../types';
import { CUSTOM_TEMPLATE_ID } from '../types';
import { uid } from '../lib/id';
import { applyTemplate } from './applyTemplate';

interface Scoped {
  schemeId: string;
}

// 本地整集合：移除指定方案的记录
async function removeFromLocal(collection: string, schemeId: string): Promise<void> {
  const sm = getStorageManager();
  const items =
    (await sm.getCollection<Scoped[]>(collection as never)) ?? [];
  const next = items.filter((it) => it.schemeId !== schemeId);
  if (next.length !== items.length) {
    await sm.setCollection(collection as never, next);
  }
}

// 分片集合：移除指定方案记录；分片清空则删除该键
async function removeFromSharded(
  collection: string,
  schemeId: string,
): Promise<void> {
  const sm = getStorageManager();
  const keys = await sm.listShardKeys(collection as never);
  for (const key of keys) {
    const items =
      (await sm.getKey<Scoped[]>(collection as never, key)) ?? [];
    const next = items.filter((it) => it.schemeId !== schemeId);
    if (next.length === 0) {
      await sm.removeKey(collection as never, key);
    } else if (next.length !== items.length) {
      await sm.setKey(collection as never, key, next);
    }
  }
}

function makeSchemeRecord(name: string, templateId: string): Scheme {
  const now = Date.now();
  return {
    id: uid(),
    name,
    templateId,
    createdAt: now,
    updatedAt: now,
    deleted: false,
    deletedAt: null,
  };
}

async function persistScheme(scheme: Scheme): Promise<void> {
  const sm = getStorageManager();
  const schemes =
    (await sm.getCollection<Scheme[]>(COLLECTIONS.schemes)) ?? [];
  await sm.setCollection(COLLECTIONS.schemes, [...schemes, scheme]);
}

// 从模板创建方案：先建方案，再把模板数据挂到该方案下
export async function createSchemeFromTemplate(
  template: PayTemplate,
): Promise<Scheme> {
  const scheme = makeSchemeRecord(template.name, template.id);
  await persistScheme(scheme);
  await applyTemplate(template, scheme.id);
  return scheme;
}

// 空白方案
export async function createBlankScheme(name = '空白方案'): Promise<Scheme> {
  const scheme = makeSchemeRecord(name, CUSTOM_TEMPLATE_ID);
  await persistScheme(scheme);
  return scheme;
}

export async function renameScheme(id: string, name: string): Promise<void> {
  const sm = getStorageManager();
  const schemes =
    (await sm.getCollection<Scheme[]>(COLLECTIONS.schemes)) ?? [];
  const next = schemes.map((s) =>
    s.id === id ? { ...s, name, updatedAt: Date.now() } : s,
  );
  await sm.setCollection(COLLECTIONS.schemes, next);
}

// 级联删除：组件/结构/员工（本地）+ 工资条/外部输入（分片）+ 方案本身
export async function deleteSchemeCascade(id: string): Promise<void> {
  await removeFromLocal(COLLECTIONS.components, id);
  await removeFromLocal(COLLECTIONS.structures, id);
  await removeFromLocal(COLLECTIONS.employees, id);
  await removeFromSharded(COLLECTIONS.paySlips, id);
  await removeFromSharded(COLLECTIONS.monthlyInputs, id);

  const sm = getStorageManager();
  const schemes =
    (await sm.getCollection<Scheme[]>(COLLECTIONS.schemes)) ?? [];
  await sm.setCollection(
    COLLECTIONS.schemes,
    schemes.filter((s) => s.id !== id),
  );
}

export interface SchemeStats {
  components: number;
  structures: number;
  employees: number;
}

// 方案数据量统计
export async function getSchemeStats(id: string): Promise<SchemeStats> {
  const sm = getStorageManager();
  const count = async <T extends Scoped>(collection: string) =>
    (
      (await sm.getCollection<T[]>(collection as never)) ?? []
    ).filter((it) => it.schemeId === id).length;

  return {
    components: await count<PayComponent>(COLLECTIONS.components),
    structures: await count<PayStructure>(COLLECTIONS.structures),
    employees: await count<Employee>(COLLECTIONS.employees),
  };
}

export type { PaySlip, MonthlyInput };
