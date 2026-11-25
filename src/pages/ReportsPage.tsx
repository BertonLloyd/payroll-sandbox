// 报表中心：月度成本汇总、部门/结构成本、固浮比，支持导出
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { usePayroll } from '@/store';
import { getStorageManager } from '@/storage/factory';
import type { PaySlip } from '@/types';
import {
  fixedFloatingRatio,
  groupByDepartment,
  groupByStructure,
  loadAllPayslips,
  summarize,
} from '@/services/reports';
import { exportPayslipsExcel } from '@/services/excel';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRIMARY = '#0f76a8';
const LIGHT = '#6fb3d2';
const MUTED = '#9aa7b0';

export default function ReportsPage() {
  const { employees, structures, components } = usePayroll();
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);

  useEffect(() => {
    loadAllPayslips(getStorageManager()).then(setPaySlips);
  }, []);

  const periods = useMemo(() => {
    const set = new Set(
      paySlips
        .filter((s) => s.status !== 'void')
        .map((s) => `${s.year}-${s.month}`),
    );
    return [...set].sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return by - ay || bm - am;
    });
  }, [paySlips]);

  const [period, setPeriod] = useState<string>('');

  useEffect(() => {
    if (!period && periods[0]) setPeriod(periods[0]);
  }, [period, periods]);

  const slips = useMemo(
    () =>
      paySlips.filter(
        (s) => s.status !== 'void' && `${s.year}-${s.month}` === period,
      ),
    [paySlips, period],
  );

  const summary = useMemo(() => summarize(slips), [slips]);
  const byDept = useMemo(
    () => groupByDepartment(slips, employees),
    [slips, employees],
  );
  const byStructure = useMemo(
    () => groupByStructure(slips, employees, structures),
    [slips, employees, structures],
  );
  const ff = useMemo(
    () => fixedFloatingRatio(slips, components),
    [slips, components],
  );
  const ffTotal = ff.fixed + ff.floating;
  const pieData = [
    { name: '固定部分', value: ff.fixed },
    { name: '浮动部分', value: ff.floating },
  ];

  if (periods.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        暂无已生成的工资条，请先到算薪工作台算薪
      </p>
    );
  }

  const summaryCards = [
    { label: '应发合计', value: summary.gross },
    { label: '个税合计', value: summary.tax },
    { label: '扣除合计', value: summary.totalDeduction },
    { label: '实发合计', value: summary.net },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
        <Button
          variant="outline"
          onClick={() =>
            exportPayslipsExcel(
              slips,
              (id) => employees.find((e) => e.id === id)?.name ?? id,
            )
          }
        >
          <Download className="size-4" /> 导出工资条 Excel
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {formatMoney(c.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各部门应发 / 实发</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDept}>
                <XAxis dataKey="key" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Legend />
                <Bar dataKey="gross" name="应发" fill={PRIMARY} radius={[3, 3, 0, 0]} />
                <Bar dataKey="net" name="实发" fill={LIGHT} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              固浮比（固定 {ffTotal ? Math.round((ff.fixed / ffTotal) * 100) : 0}% /
              浮动 {ffTotal ? Math.round((ff.floating / ffTotal) * 100) : 0}%）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                >
                  <Cell fill={PRIMARY} />
                  <Cell fill={MUTED} />
                </Pie>
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">各薪酬结构成本</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byStructure} layout="vertical">
              <XAxis type="number" fontSize={12} tickLine={false} />
              <YAxis
                type="category"
                dataKey="key"
                fontSize={12}
                tickLine={false}
                width={100}
              />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Bar dataKey="gross" name="应发" fill={PRIMARY} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
