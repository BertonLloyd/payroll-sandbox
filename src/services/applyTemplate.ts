// 应用模板：重新生成全部 id 并保持引用关系，追加到现有数据
import type {
  BlockNode,
  CalcConfig,
  Employee,
  PayComponent,
  PayStructure,
  PayTemplate,
  RefNode,
} from '../types';
import { getStorageManager } from '../storage/factory';
import { COLLECTIONS } from '../storage/collections';
import { uid } from '../lib/id';

function remapRef(node: RefNode, map: Map<string, string>): RefNode {
  if (node.refType === 'component' && node.componentId) {
    return { ...node, componentId: map.get(node.componentId) ?? node.componentId };
  }
  return node;
}

function remapAst(node: BlockNode, map: Map<string, string>): BlockNode {
  switch (node.type) {
    case 'ref':
      return remapRef(node, map);
    case 'compare':
      return {
        ...node,
        left: remapRef(node.left, map),
        right:
          typeof node.right === 'number'
            ? node.right
            : remapRef(node.right, map),
      };
    case 'logic':
      return {
        ...node,
        operands: node.operands.map((o) => remapAst(o, map) as never),
      };
    case 'math':
      return {
        ...node,
        operands: node.operands.map((o) => remapAst(o, map)),
      };
    case 'condition':
      return {
        ...node,
        branches: node.branches.map((b) => ({
          when: remapAst(b.when, map) as never,
          then: remapAst(b.then, map),
        })),
        else: remapAst(node.else, map),
      };
  }
}

function remapConfig(
  config: CalcConfig,
  map: Map<string, string>,
): CalcConfig {
  switch (config.kind) {
    case 'ratio':
    case 'tiered':
      return {
        ...config,
        baseComponentId: map.get(config.baseComponentId) ?? config.baseComponentId,
      };
    case 'blocks':
      return { ...config, ast: remapAst(config.ast, map) };
    case 'fixed':
    case 'external':
      return config;
  }
}

export async function applyTemplate(template: PayTemplate): Promise<void> {
  const sm = getStorageManager();
  const { components, structures, sampleEmployees } = template.payload;

  // 1. 组件 id 映射 + 重写内部引用
  const componentIdMap = new Map<string, string>();
  components.forEach((c) => componentIdMap.set(c.id, uid()));
  const newComponents: PayComponent[] = components.map((c) => ({
    ...c,
    id: componentIdMap.get(c.id)!,
    calcConfig: remapConfig(c.calcConfig, componentIdMap),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // 2. 结构 id 映射，重写分组/条目引用
  const structureIdMap = new Map<string, string>();
  structures.forEach((s) => structureIdMap.set(s.id, uid()));
  const newStructures: PayStructure[] = structures.map((s) => {
    const groupMap = new Map<string, string>();
    const groups = s.groups.map((g) => {
      const nid = uid();
      groupMap.set(g.id, nid);
      return { ...g, id: nid };
    });
    const items = s.items.map((it) => ({
      ...it,
      id: uid(),
      componentId:
        componentIdMap.get(it.componentId) ?? it.componentId,
      groupId: groupMap.get(it.groupId) ?? it.groupId,
    }));
    return {
      ...s,
      id: structureIdMap.get(s.id)!,
      groups,
      items,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  // 3. 员工重写结构引用
  const newEmployees: Employee[] = sampleEmployees.map((e) => ({
    ...e,
    id: uid(),
    structureId:
      structureIdMap.get(e.structureId) ?? e.structureId,
    overrides: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  // 4. 追加到现有集合
  const existingComponents =
    (await sm.getCollection<PayComponent[]>(COLLECTIONS.components)) ?? [];
  await sm.setCollection(COLLECTIONS.components, [
    ...existingComponents,
    ...newComponents,
  ]);

  const existingStructures =
    (await sm.getCollection<PayStructure[]>(COLLECTIONS.structures)) ?? [];
  await sm.setCollection(COLLECTIONS.structures, [
    ...existingStructures,
    ...newStructures,
  ]);

  const existingEmployees =
    (await sm.getCollection<Employee[]>(COLLECTIONS.employees)) ?? [];
  await sm.setCollection(COLLECTIONS.employees, [
    ...existingEmployees,
    ...newEmployees,
  ]);
}
