// 公平性与倒挂分析：同组统计、个体偏离、职级倒挂，纯函数
import type { Employee, PaySlip } from '../types';

export interface PeerStat {
  key: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  std: number;
  cv: number; // 变异系数 = 标准差 / 均值
}

function medianOf(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function peerStats(
  employees: Employee[],
  slips: PaySlip[],
  keyOf: (e: Employee) => string,
): PeerStat[] {
  const groups = new Map<string, number[]>();
  for (const slip of slips) {
    const e = employees.find((x) => x.id === slip.employeeId);
    if (!e) continue;
    const key = keyOf(e);
    const arr = groups.get(key) ?? [];
    arr.push(slip.gross);
    groups.set(key, arr);
  }
  return [...groups].map(([key, vals]) => {
    const count = vals.length;
    const avg = vals.reduce((a, b) => a + b, 0) / count;
    const std = Math.sqrt(
      vals.reduce((a, b) => a + (b - avg) ** 2, 0) / count,
    );
    return {
      key,
      count,
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg,
      median: medianOf(vals),
      std,
      cv: avg ? std / avg : 0,
    };
  });
}

export interface DeviationRow {
  employeeId: string;
  name: string;
  group: string;
  level: string;
  pay: number;
  avg: number;
  deviation: number;
  flagged: boolean;
}

export function deviations(
  employees: Employee[],
  slips: PaySlip[],
  keyOf: (e: Employee) => string,
  threshold = 0.2,
): DeviationRow[] {
  const statMap = new Map(
    peerStats(employees, slips, keyOf).map((s) => [s.key, s]),
  );
  const rows: DeviationRow[] = [];
  for (const slip of slips) {
    const e = employees.find((x) => x.id === slip.employeeId);
    if (!e) continue;
    const group = keyOf(e);
    const st = statMap.get(group);
    if (!st) continue;
    const deviation = st.avg ? (slip.gross - st.avg) / st.avg : 0;
    rows.push({
      employeeId: e.id,
      name: e.name,
      group,
      level: e.level,
      pay: slip.gross,
      avg: st.avg,
      deviation,
      flagged: Math.abs(deviation) > threshold,
    });
  }
  return rows.sort((a, b) => a.deviation - b.deviation);
}

export interface Inversion {
  higherLevel: string;
  lowerLevel: string;
  higherAvg: number;
  lowerAvg: number;
  gap: number;
}

function extractLevelNumber(level: string): number | null {
  const m = level.match(/\d+/);
  return m ? Number(m[0]) : null;
}

export function levelInversions(
  employees: Employee[],
  slips: PaySlip[],
): Inversion[] {
  const numbered = peerStats(employees, slips, (e) => e.level)
    .map((s) => ({ s, num: extractLevelNumber(s.key) }))
    .filter((x) => x.num !== null)
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0));

  const out: Inversion[] = [];
  for (let i = 1; i < numbered.length; i += 1) {
    const lower = numbered[i - 1];
    const higher = numbered[i];
    if (higher.s.avg <= lower.s.avg) {
      out.push({
        higherLevel: higher.s.key,
        lowerLevel: lower.s.key,
        higherAvg: higher.s.avg,
        lowerAvg: lower.s.avg,
        gap: higher.s.avg - lower.s.avg,
      });
    }
  }
  return out;
}
