// 首次启动初始化：确保内置模板可用；无任何参数包时写入默认参数包
import { getStorageManager } from '../storage/factory';
import { COLLECTIONS } from '../storage/collections';
import { makeDefaultParamPack } from './defaultParamPack';
import { BUILTIN_TEMPLATES } from './templates';
import type { PayTemplate, TaxParamPack } from '../types';

function mergeBuiltinTemplates(stored: PayTemplate[]): PayTemplate[] {
  const builtinIds = new Set(BUILTIN_TEMPLATES.map((t) => t.id));
  const userTemplates = stored.filter((t) => !builtinIds.has(t.id));
  return [...BUILTIN_TEMPLATES, ...userTemplates];
}

export async function ensureSeedData(): Promise<void> {
  const sm = getStorageManager();

  // 内置模板始终补齐（用户自建模板保留）
  const storedTemplates =
    (await sm.getCollection<PayTemplate[]>(COLLECTIONS.templates)) ?? [];
  await sm.setCollection(
    COLLECTIONS.templates,
    mergeBuiltinTemplates(storedTemplates),
  );

  // 无任何参数包（含已删）时写入默认包
  const storedPacks =
    (await sm.getCollection<TaxParamPack[]>(COLLECTIONS.paramPacks)) ?? [];
  if (storedPacks.length === 0) {
    await sm.setCollection(COLLECTIONS.paramPacks, [makeDefaultParamPack()]);
  }
}
