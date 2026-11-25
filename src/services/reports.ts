// 报表数据计算：月度汇总、按部门/结构分组、固浮比，纯函数
import type { Employee, PayComponent, PaySlip } from '../types';
import type { StorageManager } from '../storage/StorageManager';
import { COLLECTIONS } from '../storage/collections';

// 加载全部分片的工资条（报表与公平性页复用）
export async function loadAllPayslips(
  sm: StorageManager,
): Promise<PaySlip[]> {
  const keys = await sm.listShardKeys(COLLECTIONS.paySlips);
  const groups = await Promise.all(
    keys.map((k) => sm.getKey<PaySlip[]>(COLLECTIONS.paySlips, k)),
  );
  return groups.flatMap((g) => g ?? []);
}

export interface MonthlySummary {
  gross: number;
  tax: number;
  totalDeduction: number;
  net: number;
  count: number;
}

export function summarize(slips: PaySlip[]): MonthlySummary {
  return slips.reduce<MonthlySummary>(
    (acc, s) => ({
      gross: acc.gross + s.gross,
      tax: acc.tax + s.tax,
      totalDeduction: acc.totalDeduction + s.totalDeduction,
      net: acc.net + s.net,
      count: acc.count + 1,
    }),
    { gross: 0, tax: 0, totalDeduction: 0, net: 0, count: 0 },
  );
}

export interface GroupMetric {
  key: string;
  gross: number;
  net: number;
  count: number;
}

function groupBy(
  slips: PaySlip[],
  employees: Employee[],
  keyOf: (e: Employee) => string,
): GroupMetric[] {
  const map = new Map<string, GroupMetric>();
  for (const slip of slips) {
    const employee = employees.find((e) => e.id === slip.employeeId);
    const key = employee ? keyOf(employee) : '未分配';
    const cur = map.get(key) ?? { key, gross: 0, net: 0, count: 0 };
    cur.gross += slip.gross;
    cur.net += slip.net;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()];
}

export function groupByDepartment(
  slips: PaySlip[],
  employees: Employee[],
): GroupMetric[] {
  return groupBy(slips, employees, (e) => e.department || '未分配');
}

export function groupByStructure(
  slips: PaySlip[],
  employees: Employee[],
  structures: { id: string; name: string }[],
): GroupMetric[] {
  return groupBy(slips, employees, (e) => {
    const st = structures.find((s) => s.id === e.structureId);
    return st?.name ?? '未分配';
  });
}

export interface FixedFloating {
  fixed: number;
  floating: number;
}

// 固浮比口径：加项中固定金额组件计入固定，其余计算方式计入浮动
export function fixedFloatingRatio(
  slips: PaySlip[],
  components: PayComponent[],
): FixedFloating {
  const result: FixedFloating = { fixed: 0, floating: 0 };
  for (const slip of slips) {
    for (const line of slip.lines) {
      if (line.nature !== 'earning') continue;
      const component = components.find((c) => c.id === line.componentId);
      if (component?.calcType === 'fixed') result.fixed += line.amount;
      else result.floating += line.amount;
    }
  }
  return result;
}
