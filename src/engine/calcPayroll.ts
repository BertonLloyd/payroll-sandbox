// 主算薪流程：组件→结构→员工三层覆盖，拓扑计算，再叠加社保个税，产出工资条
import type {
  Employee,
  PayComponent,
  PaySlip,
  PaySlipLine,
  PayStructure,
  TaxParamPack,
} from '../types';
import { mergeConfig, evalComponent, type EngineContext } from './componentEval';
import { collectConfigDeps } from './collectDeps';
import { topoSort } from './topoSort';
import { calcSocial, calcMonthlyTax } from './tax';
import { uid } from '../lib/id';

export interface CalcPayrollInput {
  schemeId: string;
  employee: Employee;
  structure: PayStructure;
  components: PayComponent[];
  paramPack: TaxParamPack;
  inputValues: Record<string, number>;
  year: number;
  month: number;
  socialBase?: number;
  // 可选组件结果乘数：沙盘用于浮动工资整体系数，缺省返回 1，不影响现有算薪
  componentMultiplier?: (componentId: string) => number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickEmployeeOverride(
  employee: Employee,
  componentId: string,
  period: string,
) {
  const matches = employee.overrides
    .filter((o) => o.componentId === componentId && o.effectiveMonth <= period)
    .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));
  return matches.length
    ? matches[matches.length - 1].overrideConfig
    : undefined;
}

export function calcPayroll(input: CalcPayrollInput): PaySlip {
  const {
    employee,
    structure,
    components,
    paramPack,
    inputValues,
    year,
    month,
  } = input;
  const period = `${year}-${String(month).padStart(2, '0')}`;

  const componentMap = new Map(components.map((c) => [c.id, c]));

  // 结构内有效条目（组件仍存在）
  const items = structure.items.filter((it) => componentMap.has(it.componentId));
  const itemIds = items.map((it) => it.componentId);

  // 解析每个组件的最终配置（组件默认 → 结构覆盖 → 员工覆盖）
  const resolvedConfigs = new Map(
    items.map((it) => {
      const component = componentMap.get(it.componentId)!;
      const empOverride = pickEmployeeOverride(employee, it.componentId, period);
      const config = mergeConfig(
        component.calcConfig,
        it.override,
        empOverride,
      );
      return [it.componentId, config];
    }),
  );

  // 构建依赖图并拓扑排序（仅统计结构内依赖）
  const earningIds = itemIds.filter(
    (id) => componentMap.get(id)!.nature === 'earning',
  );
  const deps = new Map<string, string[]>();
  for (const id of itemIds) {
    const cfg = resolvedConfigs.get(id)!;
    const depSet = new Set(
      collectConfigDeps(cfg).filter((d) => itemIds.includes(d)),
    );
    // 病假基数取满勤应发时，考勤组件需在全部加项之后计算，保证取值完整
    if (cfg.kind === 'attendance' && cfg.sickBaseMode === 'gross') {
      earningIds.forEach((eid) => depSet.add(eid));
    }
    deps.set(id, [...depSet]);
  }
  const order = topoSort(itemIds, deps);

  // 计算上下文
  const results = new Map<string, number>();
  let standardGross = 0;
  const ctx: EngineContext = {
    getComponent: (id: string) => results.get(id),
    getInput: (key: string) => inputValues[key],
    getStandardGross: () => standardGross,
    getHireDate: () => employee.hireDate,
    getPeriod: () => ({ year, month }),
  };

  for (const id of order) {
    const raw = evalComponent(id, resolvedConfigs.get(id)!, ctx);
    const multiplier = input.componentMultiplier?.(id) ?? 1;
    const rounded = round2(raw * multiplier);
    results.set(id, rounded);
    const component = componentMap.get(id)!;
    // 满勤标准应发不含“仅作基数”的组件（如销售额）
    if (component.nature === 'earning' && !component.excludeFromTotal) {
      standardGross += rounded;
    }
  }

  // 组装组件行
  const lines: PaySlipLine[] = order.map((id) => {
    const component = componentMap.get(id)!;
    return {
      componentId: id,
      name: component.name,
      nature: component.nature,
      amount: results.get(id)!,
      excludeFromTotal: component.excludeFromTotal ?? false,
    };
  });

  // 加项 / 扣项汇总（跳过仅作基数的组件）
  let gross = 0;
  let pretaxComponentDeduction = 0;
  let componentDeductionTotal = 0;
  for (const id of itemIds) {
    const component = componentMap.get(id)!;
    if (component.excludeFromTotal) continue;
    const amount = results.get(id)!;
    if (component.nature === 'earning') {
      gross += amount;
    } else {
      componentDeductionTotal += amount;
      if (component.taxTreatment === 'pretax') pretaxComponentDeduction += amount;
    }
  }

  // 社保（缴费基数缺省取应发）
  const socialBase = input.socialBase ?? gross;
  const social = calcSocial(paramPack, socialBase);
  lines.push({
    componentId: '__social__',
    name: '社保公积金（个人）',
    nature: 'deduction',
    amount: social.employeeTotal,
  });

  // 个税
  const taxBase = gross - pretaxComponentDeduction;
  const tax = calcMonthlyTax(paramPack, taxBase, social.employeeTotal);
  lines.push({
    componentId: '__tax__',
    name: '个人所得税',
    nature: 'deduction',
    amount: tax,
  });

  const totalDeduction = round2(
    componentDeductionTotal + social.employeeTotal + tax,
  );
  const net = round2(gross - totalDeduction);

  return {
    id: uid(),
    schemeId: input.schemeId,
    employeeId: employee.id,
    year,
    month,
    structureId: structure.id,
    lines,
    gross: round2(gross),
    totalDeduction,
    tax,
    net,
    status: 'draft',
    generatedAt: Date.now(),
    confirmedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deleted: false,
    deletedAt: null,
  };
}
