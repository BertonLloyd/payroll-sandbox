// 公平性与倒挂分析：按方案隔离，同组统计、个体偏离、职级倒挂，宽表格横向可滚动
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import { getStorageManager } from '@/storage/factory';
import type { PaySlip } from '@/types';
import { loadAllPayslips } from '@/services/reports';
import {
  deviations,
  levelInversions,
  peerStats,
} from '@/services/equity';
import { formatMoney, formatRatio } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DEVIATION_THRESHOLD = 0.2;

export default function EquityPage() {
  const { employees: allEmployees } = usePayroll();
  const { currentSchemeId } = useScheme();
  const [allSlips, setAllSlips] = useState<PaySlip[]>([]);
  const [dimension, setDimension] = useState<'position' | 'level'>(
    'position',
  );

  useEffect(() => {
    loadAllPayslips(getStorageManager()).then(setAllSlips);
  }, []);

  // 当前方案员工
  const employees = useMemo(
    () => allEmployees.filter((e) => e.schemeId === currentSchemeId),
    [allEmployees, currentSchemeId],
  );

  const periods = useMemo(() => {
    const set = new Set(
      allSlips.filter(
        (s) =>
          s.schemeId === currentSchemeId && s.status !== 'void',
      ).map((s) => `${s.year}-${s.month}`),
    );
    return [...set].sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return by - ay || bm - am;
    });
  }, [allSlips, currentSchemeId]);

  const [period, setPeriod] = useState('');
  useEffect(() => {
    if (!period && periods[0]) setPeriod(periods[0]);
    if (period && !periods.includes(period)) setPeriod(periods[0] ?? '');
  }, [period, periods]);

  const slips = useMemo(
    () =>
      allSlips.filter(
        (s) =>
          s.schemeId === currentSchemeId &&
          s.status !== 'void' &&
          `${s.year}-${s.month}` === period,
      ),
    [allSlips, currentSchemeId, period],
  );

  const keyOf = (e: (typeof employees)[number]) =>
    dimension === 'position' ? e.position || '未分配' : e.level || '未分配';

  const stats = useMemo(
    () => peerStats(employees, slips, keyOf),
    [employees, slips, dimension],
  );
  const rows = useMemo(
    () => deviations(employees, slips, keyOf, DEVIATION_THRESHOLD),
    [employees, slips, dimension],
  );
  const inversions = useMemo(
    () => levelInversions(employees, slips),
    [employees, slips],
  );

  if (periods.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        当前方案暂无已生成的工资条，请先到算薪工作台算薪
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择年月" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>
                {p.replace('-', ' 年 ')} 月
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={dimension}
          onValueChange={(v) => setDimension(v as never)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="position">按岗位</SelectItem>
            <SelectItem value="level">按职级</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">同组薪酬分布（应发）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>分组</TableHead>
                  <TableHead className="text-right">人数</TableHead>
                  <TableHead className="text-right">最低</TableHead>
                  <TableHead className="text-right">中位</TableHead>
                  <TableHead className="text-right">平均</TableHead>
                  <TableHead className="text-right">最高</TableHead>
                  <TableHead className="text-right">离散系数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.key}>
                    <TableCell className="font-medium">{s.key}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.min)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.median)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.avg)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.max)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRatio(s.cv)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            个体偏离（相对同组平均，超过 ±{DEVIATION_THRESHOLD * 100}% 标记需关注）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>职级</TableHead>
                  <TableHead className="text-right">应发</TableHead>
                  <TableHead className="text-right">组平均</TableHead>
                  <TableHead className="text-right">偏离</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.employeeId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.group}</TableCell>
                    <TableCell>{r.level}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.pay)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.avg)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.deviation > 0 ? '+' : ''}
                      {formatRatio(r.deviation)}
                    </TableCell>
                    <TableCell>
                      {r.flagged ? (
                        <Badge variant="secondary" className="gap-1">
                          <AlertTriangle className="size-3" /> 需关注
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="size-3" /> 正常
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">职级倒挂检测</CardTitle>
        </CardHeader>
        <CardContent>
          {inversions.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              未发现高职级平均薪酬低于低职级的倒挂情况
            </p>
          ) : (
            <div className="space-y-2">
              {inversions.map((inv) => (
                <div
                  key={`${inv.higherLevel}-${inv.lowerLevel}`}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <AlertTriangle className="size-4 text-primary" />
                  <span>
                    {inv.higherLevel} 平均 {formatMoney(inv.higherAvg)} 低于{' '}
                    {inv.lowerLevel} 平均 {formatMoney(inv.lowerAvg)}，差额{' '}
                    {formatMoney(inv.gap)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
