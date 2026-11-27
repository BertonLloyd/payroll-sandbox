// 薪酬测算沙盘影子计算：纯内存模拟，不写库；复用 calcPayroll/calcSocial，输出总用工成本与结构
import type {
  CalcType,
  Employee,
  PayComponent,
  PaySlip,
  PayStructure,
  SandboxAdjustments,
  SandboxEmployeeResult,
  SandboxGroupMetric,
  SandboxResult,
  TaxParamPack,
} from '../types';
import { calcPayroll } from '../engine/calcPayroll';
import { calcSocial } from '../engine/tax';
import { performanceFieldKey } from '../lib/inputFields';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// 受浮动乘数作用的计算方式（固定项、绩效项除外）
const FLOATING_CALC_TYPES: CalcType[] = [
  'ratio',
  'blocks',
  'tiered',
  'external',
  'fullAttendance',
];

// 调薪：对固定金额参数做参数级变换，不改动浮动结果
function scaleFixedParams(
  component: PayComponent,
  factor: number,
): PayComponent {
  const cfg = component.calcConfig;
  switch (cfg.kind) {
    case 'fixed':
      return { ...component, calcConfig: { ...cfg, amount: cfg.amount * factor } };
    case 'performance':
      if (cfg.baseMode !== 'fixed') return component;
      return {
        ...component,
        calcConfig: { ...cfg, baseAmount: cfg.baseAmount * factor },
      };
    case 'attendance':
      if (cfg.baseMode !== 'fixed') return component;
      return {
        ...component,
        calcConfig: { ...cfg, baseAmount: cfg.baseAmount * factor },
      };
    case 'seniority':
      return {
        ...component,
        calcConfig: {
          ...cfg,
          brackets: cfg.brackets.map((b) => ({ ...b, amount: b.amount * factor })),
        },
      };
    default:
      return component;
  }
}

function applySalaryAdjust(
  components: PayComponent[],
  pct: number,
): PayComponent[] {
  if (pct === 0) return components;
  const factor = 1 + pct;
  return components.map((c) => scaleFixedParams(c, factor));
}

function makeMultiplier(
  map: Map<string, PayComponent>,
  pct: number,
): (id: string) => number {
  const factor = 1 + pct;
  return (id: string) => {
    const c = map.get(id);
    return c && FLOATING_CALC_TYPES.includes(c.calcType) ? factor : 1;
  };
}

// 绩效系数：注入模拟输入，覆盖绩效组件的当月系数
function buildInputValues(
  base: Record<string, number>,
  components: PayComponent[],
  perfCoef: number,
): Record<string, number> {
  const values = { ...base };
  for (const c of components) {
    if (c.calcType === 'performance') {
      values[performanceFieldKey(c.id)] = perfCoef;
    }
  }
  return values;
}

function groupMetrics(
  results: SandboxEmployeeResult[],
  keyOf: (r: SandboxEmployeeResult) => string,
): SandboxGroupMetric[] {
  const map = new Map<string, SandboxGroupMetric>();
  for (const r of results) {
    const key = keyOf(r);
    const cur =
      map.get(key) ??
      { key, gross: 0, employerTotal: 0, totalCost: 0, count: 0 };
    cur.gross += r.slip.gross;
    cur.employerTotal += r.employerTotal;
    cur.totalCost += r.totalCost;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].map((m) => ({
    ...m,
    gross: round2(m.gross),
    employerTotal: round2(m.employerTotal),
    totalCost: round2(m.totalCost),
  }));
}

export interface RunSandboxInput {
  components: PayComponent[];
  structures: PayStructure[];
  employees: Employee[];
  paramPack: TaxParamPack;
  adjustments: SandboxAdjustments;
  year: number;
  month: number;
  // 各员工的基线外部输入（月度录入草稿），缺省为空
  baseInputs?: Record<string, Record<string, number>>;
}

export function runSandbox(input: RunSandboxInput): SandboxResult {
  const {
    components,
    structures,
    employees,
    paramPack,
    adjustments,
    year,
    month,
  } = input;

  const adjusted = applySalaryAdjust(components, adjustments.salaryAdjustPct);
  const compMap = new Map(adjusted.map((c) => [c.id, c]));
  const multiplier = makeMultiplier(compMap, adjustments.floatingAdjustPct);

  const employeeResults: SandboxEmployeeResult[] = [];
  let fixed = 0;
  let floating = 0;

  for (const emp of employees) {
    if (emp.status !== 'active') continue;
    const structure = structures.find((s) => s.id === emp.structureId);
    if (!structure) continue;

    const inputValues = buildInputValues(
      input.baseInputs?.[emp.id] ?? {},
      adjusted,
      adjustments.performanceCoef,
    );

    const common = {
      schemeId: emp.schemeId,
      employee: emp,
      structure,
      components: adjusted,
      paramPack,
      inputValues,
      year,
      month,
      componentMultiplier: multiplier,
    };

    // 先跑一次拿到应发，再按缴费基数策略决定是否重算
    const first = calcPayroll(common);
    const strategy = adjustments.socialStrategy;
    let declaredBase: number;
    let slip: PaySlip;

    if (strategy.kind === 'full') {
      declaredBase = first.gross;
      slip = first;
    } else if (strategy.kind === 'minimum') {
      declaredBase = 0;
      slip = calcPayroll({ ...common, socialBase: 0 });
    } else if (strategy.kind === 'ratio') {
      declaredBase = first.gross * (strategy.ratio ?? 1);
      slip = calcPayroll({ ...common, socialBase: declaredBase });
    } else {
      declaredBase = strategy.amount ?? 0;
      slip = calcPayroll({ ...common, socialBase: declaredBase });
    }

    // 企业承担社保：与工资条内个人社保同口径
    const employerTotal = calcSocial(paramPack, declaredBase).employerTotal;
    const totalCost = round2(slip.gross + employerTotal);

    // 固浮比基于应发：固定金额/工龄计入固定，其余加项计入浮动
    for (const line of slip.lines) {
      if (line.nature !== 'earning') continue;
      const c = compMap.get(line.componentId);
      if (!c) continue;
      if (c.calcType === 'fixed' || c.calcType === 'seniority') {
        fixed += line.amount;
      } else {
        floating += line.amount;
      }
    }

    employeeResults.push({
      employeeId: emp.id,
      empNo: emp.empNo,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      structureName: structure.name,
      slip,
      employerTotal,
      totalCost,
    });
  }

  const headcount = employeeResults.length;
  const gross = round2(employeeResults.reduce((s, r) => s + r.slip.gross, 0));
  const employerTotalSum = round2(
    employeeResults.reduce((s, r) => s + r.employerTotal),
  );
  const totalCost = round2(gross + employerTotalSum);
  const avgCost = headcount ? round2(totalCost / headcount) : 0;
  fixed = round2(fixed);
  floating = round2(floating);
  const ffTotal = fixed + floating;
  const fixedPct = ffTotal ? fixed / ffTotal : 0;
  const floatingPct = ffTotal ? floating / ffTotal : 0;
  const budgetGap = round2(adjustments.budgetCap - totalCost);
  const costRate =
    adjustments.revenue && adjustments.revenue > 0
      ? totalCost / adjustments.revenue
      : null;

  return {
    employees: employeeResults,
    summary: {
      headcount,
      gross,
      employerTotal: employerTotalSum,
      totalCost,
      avgCost,
      fixed,
      floating,
      fixedPct,
      floatingPct,
      budgetGap,
      overBudget: budgetGap < 0,
      costRate,
    },
    byDepartment: groupMetrics(employeeResults, (r) => r.department || '未分配'),
    byStructure: groupMetrics(employeeResults, (r) => r.structureName || '未分配'),
  };
}
