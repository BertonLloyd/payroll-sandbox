// 薪酬测算沙盘 KPI 卡片：总用工成本、人均、固浮比、预算执行、人力成本率，均带基线差异
import type { ReactNode } from 'react';
import type { SandboxSummary } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatRatio } from '@/lib/format';

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
        {sub}
      </CardContent>
    </Card>
  );
}

function Delta({
  current,
  baseline,
}: {
  current: number;
  baseline: number;
}) {
  const d = current - baseline;
  if (Math.abs(d) < 0.005) {
    return <span className="text-xs text-muted-foreground">与基线持平</span>;
  }
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      较基线 {d > 0 ? '+' : ''}
      {formatCurrency(d)}
    </span>
  );
}

export function SandboxKpi({
  summary,
  baseline,
}: {
  summary: SandboxSummary;
  baseline: SandboxSummary;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="工资性总用工成本"
        value={formatCurrency(summary.totalCost)}
        sub={<Delta current={summary.totalCost} baseline={baseline.totalCost} />}
      />
      <KpiCard
        label="人均用工成本"
        value={formatCurrency(summary.avgCost)}
        sub={<Delta current={summary.avgCost} baseline={baseline.avgCost} />}
      />
      <KpiCard
        label="固浮比（固定占比）"
        value={formatRatio(summary.fixedPct)}
        sub={
          <span className="text-xs tabular-nums text-muted-foreground">
            浮动 {formatRatio(summary.floatingPct)}
          </span>
        }
      />
      <KpiCard
        label={summary.overBudget ? '预算超支' : '预算有余'}
        value={formatCurrency(Math.abs(summary.budgetGap))}
        sub={
          <span className="text-xs tabular-nums text-muted-foreground">
            {summary.overBudget ? '超出预算上限' : '低于预算上限'}
          </span>
        }
      />
      <KpiCard
        label="人力成本率"
        value={summary.costRate === null ? '—' : formatRatio(summary.costRate)}
        sub={
          <span className="text-xs text-muted-foreground">
            {summary.costRate === null ? '未填写营收' : '总用工成本 ÷ 营收'}
          </span>
        }
      />
    </div>
  );
}
