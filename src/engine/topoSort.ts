// 拓扑排序（Kahn）：确定组件计算顺序，同时检测循环引用
import { PayrollEngineError } from './errors';

export function topoSort(
  nodes: string[],
  deps: Map<string, string[]>,
): string[] {
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n, 0);
    dependents.set(n, []);
  });

  for (const [node, prereqs] of deps) {
    for (const pre of prereqs) {
      if (!nodes.includes(pre)) continue; // 依赖已删除/不存在时忽略
      dependents.get(pre)!.push(node);
      inDegree.set(node, (inDegree.get(node) ?? 0) + 1);
    }
  }

  const queue = nodes.filter((n) => inDegree.get(n) === 0);
  const result: string[] = [];

  while (queue.length) {
    const n = queue.shift()!;
    result.push(n);
    for (const d of dependents.get(n) ?? []) {
      inDegree.set(d, inDegree.get(d)! - 1);
      if (inDegree.get(d) === 0) queue.push(d);
    }
  }

  if (result.length !== nodes.length) {
    const cycle = nodes.filter((n) => !result.includes(n));
    throw new PayrollEngineError(
      `检测到循环引用，涉及组件：${cycle.join('、')}`,
      'CYCLE_DETECTED',
    );
  }
  return result;
}
