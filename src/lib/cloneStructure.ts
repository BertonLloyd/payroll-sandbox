// 结构复制：深拷贝并重新生成分组/条目 id，避免与原结构共享 id
import type { AuditFields, PayStructure } from '../types';
import { uid } from './id';

type StructureInput = Omit<PayStructure, keyof AuditFields | 'id'>;

export function cloneStructure(source: PayStructure): StructureInput {
  const groupIdMap = new Map<string, string>();
  const groups = source.groups.map((g) => {
    const newId = uid();
    groupIdMap.set(g.id, newId);
    return { ...g, id: newId };
  });

  const items = source.items.map((it) => ({
    ...it,
    id: uid(),
    groupId: groupIdMap.get(it.groupId) ?? it.groupId,
  }));

  return {
    name: `${source.name} 副本`,
    description: source.description,
    status: 'active',
    groups,
    items,
  };
}
