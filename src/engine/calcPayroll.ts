// 主算薪流程：组件→结构→员工三层覆盖，拓扑计算，再叠加社保个税，产出工资条
import type {
  Employee,
  PayComponent,
  PaySlip,
  PaySlipLine,
  PayStructure,
  TaxParamPack,
} from '../types';
import { mergeConfig, evalComponent } from './componentEval';
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
  const deps = new Map<string, string[]>();
  for (const id of itemIds) {
    deps.set(
      id,
      collectConfigDeps(resolvedConfigs.get(id)!).filter((d) =>
        itemIds.includes(d),
      ),
    );
  }
  const order = topoSort(itemIds, deps);

  // 计算上下文
  const results = new Map<string, number>();
  const ctx = {
    getComponent: (id: string) => results.get(id),
    getInput: (key: string) => inputValues[key],
  };

  for (const id of order) {
    const value = evalComponent(resolvedConfigs.get(id)!, ctx);
    results.set(id, round2(value));
  }

  // 组装组件行
  const lines: PaySlipLine[] = order.map((id) => {
    const component = componentMap.get(id)!;
    return {
      componentId: id,
      name: component.name,
      nature: component.nature,
      amount: results.get(id)!,
    };
  });

  // 加项 / 扣项汇总
  let gross = 0;
  let pretaxComponentDeduction = 0;
  let componentDeductionTotal = 0;
  for (const id of itemIds) {
    const component = componentMap.get(id)!;
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
