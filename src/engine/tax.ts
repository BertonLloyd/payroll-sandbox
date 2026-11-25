// 个税与社保计算：参数全部来自可编辑参数包；首版个税采用月度口径（累计预扣留待后续）
import type { TaxParamPack, TierBracket } from '../types';

export interface SocialLine {
  name: string;
  base: number;
  employee: number;
  employer: number;
}

export interface SocialBreakdown {
  lines: SocialLine[];
  employeeTotal: number;
  employerTotal: number;
}

function clampBase(base: number, min: number, max: number): number {
  return Math.min(Math.max(base, min), max);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcSocial(
  pack: TaxParamPack,
  socialBase: number,
): SocialBreakdown {
  const all = [...pack.social, pack.fund];
  const lines: SocialLine[] = all.map((it) => {
    const base = clampBase(socialBase, it.baseMin, it.baseMax);
    return {
      name: it.name,
      base,
      employee: round2(base * it.employeeRate),
      employer: round2(base * it.employerRate),
    };
  });
  return {
    lines,
    employeeTotal: round2(lines.reduce((s, l) => s + l.employee, 0)),
    employerTotal: round2(lines.reduce((s, l) => s + l.employer, 0)),
  };
}

function applyBrackets(income: number, brackets: TierBracket[]): number {
  const sorted = [...brackets].sort((a, b) => a.upTo - b.upTo);
  for (const b of sorted) {
    if (income <= b.upTo) {
      return Math.max(0, income * b.rate - (b.deduct ?? 0));
    }
  }
  const last = sorted[sorted.length - 1];
  return Math.max(0, income * last.rate - (last.deduct ?? 0));
}

// 月度个税：应纳税所得额 = 税前收入 - 社保个人部分 - 起征点
export function calcMonthlyTax(
  pack: TaxParamPack,
  pretaxIncome: number,
  socialEmployee: number,
): number {
  const taxable = pretaxIncome - socialEmployee - pack.tax.threshold;
  if (taxable <= 0) return 0;
  return round2(applyBrackets(taxable, pack.tax.brackets));
}
