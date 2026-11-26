// 依赖收集：从积木 AST 与计算配置中提取所依赖的组件 id，用于拓扑排序
import type { BlockNode, CalcConfig } from '../types';

export function collectAstComponentIds(
  node: BlockNode,
  acc: Set<string> = new Set(),
): Set<string> {
  switch (node.type) {
    case 'ref':
      if (node.refType === 'component' && node.componentId)
        acc.add(node.componentId);
      break;
    case 'compare': {
      if (node.left.refType === 'component' && node.left.componentId)
        acc.add(node.left.componentId);
      if (typeof node.right !== 'number') {
        const r = node.right;
        if (r.refType === 'component' && r.componentId) acc.add(r.componentId);
      }
      break;
    }
    case 'logic':
      node.operands.forEach((c) => collectAstComponentIds(c, acc));
      break;
    case 'math':
      node.operands.forEach((o) => collectAstComponentIds(o, acc));
      break;
    case 'condition':
      node.branches.forEach((b) => {
        collectAstComponentIds(b.when, acc);
        collectAstComponentIds(b.then, acc);
      });
      collectAstComponentIds(node.else, acc);
      break;
  }
  return acc;
}

export function collectConfigDeps(config: CalcConfig): string[] {
  const deps = new Set<string>();
  switch (config.kind) {
    case 'ratio':
    case 'tiered':
      deps.add(config.baseComponentId);
      break;
    case 'blocks':
      collectAstComponentIds(config.ast, deps);
      break;
    case 'performance':
      config.baseComponentIds.forEach((id) => deps.add(id));
      break;
    case 'attendance':
      config.baseComponentIds.forEach((id) => deps.add(id));
      config.sickBaseComponentIds.forEach((id) => deps.add(id));
      break;
    case 'fixed':
    case 'external':
    case 'fullAttendance':
    case 'seniority':
      break;
  }
  return [...deps];
}
