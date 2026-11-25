// 单组件求值：按五种计算方式取值，并处理配置覆盖合并、取整、阶梯分段
import type {
  CalcConfig,
  RoundRule,
  TierBracket,
} from '../types';
import { evalBlock, type BlockContext } from './astEval';

export function mergeConfig(
  base: CalcConfig,
  ...overrides: (Partial<CalcConfig> | undefined)[]
): CalcConfig {
  return Object.assign(
    {},
    base,
    ...overrides.filter((o): o is Partial<CalcConfig> => !!o),
  ) as CalcConfig;
}

function roundBy(value: number, rule: RoundRule): number {
  const f = Math.pow(10, rule.decimals);
  const scaled = value * f;
  const rounded = rule.mode === 'down' ? Math.trunc(scaled) : Math.round(scaled);
  return rounded / f;
}

// 阶梯分段：按基数落档，支持速算扣除数；upTo 可设为 Infinity 表示封顶档
function evalTiered(base: number, brackets: TierBracket[]): number {
  const sorted = [...brackets].sort((a, b) => a.upTo - b.upTo);
  for (const b of sorted) {
    if (base <= b.upTo) {
      return base * b.rate - (b.deduct ?? 0);
    }
  }
  const last = sorted[sorted.length - 1];
  return base * last.rate - (last.deduct ?? 0);
}

export function evalComponent(config: CalcConfig, ctx: BlockContext): number {
  switch (config.kind) {
    case 'fixed':
      return config.amount;
    case 'ratio': {
      const base = ctx.getComponent(config.baseComponentId) ?? 0;
      return roundBy(base * config.ratio, config.roundRule);
    }
    case 'blocks':
      return evalBlock(config.ast, ctx);
    case 'tiered': {
      const base = ctx.getComponent(config.baseComponentId) ?? 0;
      return evalTiered(base, config.brackets);
    }
    case 'external': {
      const input = ctx.getInput(config.inputKey);
      return (input ?? config.fallback) * config.coefficient;
    }
  }
}
