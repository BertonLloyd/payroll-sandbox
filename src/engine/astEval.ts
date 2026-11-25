// 积木 BlockNode 求值：纯函数，不接触 DOM；组件/输入引用通过上下文解析，缺失即报错
import type {
  BlockNode,
  CompareOp,
  RefNode,
} from '../types';
import { PayrollEngineError } from './errors';

export interface BlockContext {
  getComponent(id: string): number | undefined;
  getInput(key: string): number | undefined;
}

function evalRef(node: RefNode, ctx: BlockContext): number {
  switch (node.refType) {
    case 'constant':
      return node.value ?? 0;
    case 'component': {
      if (!node.componentId)
        throw new PayrollEngineError('组件引用缺少 id', 'INVALID_FORMULA');
      const v = ctx.getComponent(node.componentId);
      if (v === undefined)
        throw new PayrollEngineError(
          `引用的组件尚未计算或不存在：${node.componentId}`,
          'MISSING_REF',
        );
      return v;
    }
    case 'input': {
      if (!node.inputKey)
        throw new PayrollEngineError('输入引用缺少 key', 'INVALID_FORMULA');
      const v = ctx.getInput(node.inputKey);
      if (v === undefined)
        throw new PayrollEngineError(
          `缺少外部输入：${node.inputKey}`,
          'MISSING_INPUT',
        );
      return v;
    }
  }
}

function compare(op: CompareOp, l: number, r: number): boolean {
  switch (op) {
    case '>': return l > r;
    case '>=': return l >= r;
    case '<': return l < r;
    case '<=': return l <= r;
    case '==': return l === r;
    case '!=': return l !== r;
  }
}

function evalCompare(node: Extract<BlockNode, { type: 'compare' }>, ctx: BlockContext): boolean {
  const l = evalRef(node.left, ctx);
  const r = typeof node.right === 'number' ? node.right : evalRef(node.right, ctx);
  return compare(node.op, l, r);
}

function evalLogic(node: Extract<BlockNode, { type: 'logic' }>, ctx: BlockContext): boolean {
  return node.op === 'and'
    ? node.operands.every((c) => evalCompare(c, ctx))
    : node.operands.some((c) => evalCompare(c, ctx));
}

function evalMath(node: Extract<BlockNode, { type: 'math' }>, ctx: BlockContext): number {
  const vals = node.operands.map((o) => evalBlock(o, ctx));
  if (vals.length === 0) return 0;
  return vals.slice(1).reduce((acc, v) => {
    switch (node.op) {
      case '+': return acc + v;
      case '-': return acc - v;
      case '*': return acc * v;
      case '/': return v === 0 ? 0 : acc / v;
    }
  }, vals[0]);
}

export function evalBlock(node: BlockNode, ctx: BlockContext): number {
  switch (node.type) {
    case 'ref':
      return evalRef(node, ctx);
    case 'compare':
      return evalCompare(node, ctx) ? 1 : 0;
    case 'logic':
      return evalLogic(node, ctx) ? 1 : 0;
    case 'math':
      return evalMath(node, ctx);
    case 'condition': {
      for (const b of node.branches) {
        const ok =
          b.when.type === 'logic'
            ? evalLogic(b.when, ctx)
            : evalCompare(b.when, ctx);
        if (ok) return evalBlock(b.then, ctx);
      }
      return evalBlock(node.else, ctx);
    }
  }
}
