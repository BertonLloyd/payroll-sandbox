// Number formatting utilities
// All numbers follow: right-aligned, thousand separator, tabular-nums

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCurrency(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '-';
  if (Math.abs(n) >= 100000000) {
    return `${(n / 100000000).toFixed(2)} 亿`;
  }
  if (Math.abs(n) >= 10000) {
    return `${(n / 10000).toFixed(1)} 万`;
  }
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(digits)}%`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 金额：固定两位小数
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 比例：小数转百分比（0.05 → 5.0%）
export function formatRatio(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '-';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function parseNumber(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
