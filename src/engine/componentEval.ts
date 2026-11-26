// 单组件求值：按九种计算方式取值，并处理配置覆盖合并、取整、阶梯分段
import type {
  CalcConfig,
  RoundRule,
  TierBracket,
} from '../types';
import { evalBlock, type BlockContext } from './astEval';
import {
  attendanceFieldKeys,
  performanceFieldKey,
} from '../lib/inputFields';

// 引擎扩展上下文：在积木最小上下文上增加满勤应发、入职日期、算薪周期
export interface EngineContext extends BlockContext {
  getStandardGross(): number; // 已计算的满勤口径加项之和
  getHireDate(): string;
  getPeriod(): { year: number; month: number };
}

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

// 基数来源：固定金额或引用一个/多个组件求和
function resolveBase(
  cfg: { baseMode: 'fixed' | 'components'; baseAmount: number; baseComponentIds: string[] },
  ctx: BlockContext,
): number {
  if (cfg.baseMode === 'fixed') return cfg.baseAmount;
  return cfg.baseComponentIds.reduce(
    (sum, id) => sum + (ctx.getComponent(id) ?? 0),
    0,
  );
}

// 工龄：入职日期到算薪当月 1 日的完整周年数，不满一年为 0
export function fullYearsBetween(
  hireDate: string,
  year: number,
  month: number,
): number {
  const h = new Date(hireDate);
  if (Number.isNaN(h.getTime())) return 0;
  let years = year - h.getFullYear();
  const monthDiff = month - 1 - h.getMonth(); // 基准当月 1 日（0-based 月）
  if (monthDiff < 0 || (monthDiff === 0 && 1 < h.getDate())) years -= 1;
  return Math.max(years, 0);
}

export function evalComponent(
  componentId: string,
  config: CalcConfig,
  ctx: EngineContext,
): number {
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
    case 'performance': {
      const base = resolveBase(config, ctx);
      const coef = ctx.getInput(performanceFieldKey(componentId));
      return base * (coef ?? config.defaultCoefficient);
    }
    case 'attendance': {
      const k = attendanceFieldKeys(componentId);
      const attend = ctx.getInput(k.attend);
      const actual = ctx.getInput(k.actual);
      const hourLeave = ctx.getInput(k.hour) ?? 0;
      const sickDays = ctx.getInput(k.sick) ?? 0;

      const divisor =
        config.dayDivisor === 'actual'
          ? attend ?? config.statutoryDays
          : config.statutoryDays;
      const monthBase = resolveBase(config, ctx);
      const dailyWage = divisor > 0 ? monthBase / divisor : 0;
      const hourlyWage =
        config.workHoursPerDay > 0 ? dailyWage / config.workHoursPerDay : 0;

      // 缺勤天数 = 应出勤 − 实际出勤 − 病假，避免病假被当成旷工全扣
      const absentDays = Math.max((attend ?? 0) - (actual ?? 0) - sickDays, 0);
      const absentDeduct = dailyWage * absentDays;
      const hourDeduct = hourlyWage * hourLeave;

      // 病假基数：本人基本工资 / 满勤标准应发 / 当地最低工资
      let sickBaseMonthly: number;
      switch (config.sickBaseMode) {
        case 'base':
          sickBaseMonthly = config.sickBaseComponentIds.reduce(
            (sum, id) => sum + (ctx.getComponent(id) ?? 0),
            0,
          );
          break;
        case 'gross':
          sickBaseMonthly = ctx.getStandardGross();
          break;
        case 'minimum':
          sickBaseMonthly = config.sickMinimumAmount;
      }
      const sickDaily = divisor > 0 ? sickBaseMonthly / divisor : 0;
      const sickDeduct = sickDaily * config.sickDeductRate * sickDays;

      return absentDeduct + hourDeduct + sickDeduct;
    }
    case 'fullAttendance': {
      const k = attendanceFieldKeys(config.attendanceComponentId);
      const attend = ctx.getInput(k.attend);
      const actual = ctx.getInput(k.actual);
      const hourLeave = ctx.getInput(k.hour) ?? 0;
      const sickDays = ctx.getInput(k.sick) ?? 0;
      const absentDays = Math.max((attend ?? 0) - (actual ?? 0) - sickDays, 0);

      let ok = true;
      if (config.requireNoAbsent) ok = ok && absentDays === 0;
      if (config.requireNoSick) ok = ok && sickDays === 0;
      if (config.requireNoHourLeave) ok = ok && hourLeave === 0;
      return ok ? config.amount : 0;
    }
    case 'seniority': {
      const { year, month } = ctx.getPeriod();
      const years = fullYearsBetween(ctx.getHireDate(), year, month);
      const sorted = [...config.brackets].sort(
        (a, b) => a.minYears - b.minYears,
      );
      let amount = 0;
      for (const b of sorted) if (years >= b.minYears) amount = b.amount;
      return amount;
    }
  }
}
