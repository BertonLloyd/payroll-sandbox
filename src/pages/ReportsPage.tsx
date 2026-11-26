// 报表中心：按方案隔离，月度成本汇总、部门/结构成本、固浮比，图表横向可滚动，支持导出
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { useScheme } from '@/store/SchemeProvider';
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

// 图表横向滚动容器：内容最小宽度，超出出现横拉条
function ChartScroll({
  minWidth,
  children,
}: {
  minWidth: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const { employees, structures, components } = usePayroll();
  const { currentSchemeId } = useScheme();
  const [paySlips, setPaySlips] = useState<PaySlip[]>([]);

  useEffect(() => {
    loadAllPayslips(getStorageManager()).then(setPaySlips);
  }, []);

  // 当前方案的员工/结构
  const schemeEmployees = useMemo(
    () => employees.filter((e) => e.schemeId === currentSchemeId),
    [employees, currentSchemeId],
  );
  const schemeStructures = useMemo(
    () => structures.filter((s) => s.schemeId === currentSchemeId),
    [structures, currentSchemeId],
  );

  const periods = useMemo(() => {
    const set = new Set(
      paySlips
        .filter((s) => s.schemeId === currentSchemeId && s.status !== 'void')
        .map((s) => `${s.year}-${s.month}`),
    );
    return [...set].sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return by - ay || bm - am;
    });
  }, [paySlips, currentSchemeId]);

  const [period, setPeriod] = useState<string>('');

  useEffect(() => {
    if (!period && periods[0]) setPeriod(periods[0]);
    if (period && !periods.includes(period)) setPeriod(periods[0] ?? '');
  }, [period, periods]);

  const slips = useMemo(
    () =>
      paySlips.filter(
        (s) =>
          s.schemeId === currentSchemeId &&
          s.status !== 'void' &&
          `${s.year}-${s.month}` === period,
      ),
    [paySlips, currentSchemeId, period],
  );

  const summary = useMemo(() => summarize(slips), [slips]);
  const byDept = useMemo(
    () => groupByDepartment(slips, schemeEmployees),
    [slips, schemeEmployees],
  );
  const byStructure = useMemo(
    () => groupByStructure(slips, schemeEmployees, schemeStructures),
    [slips, schemeEmployees, schemeStructures],
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
        当前方案暂无已生成的工资条，请先到算薪工作台算薪
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
          onClick={() => exportPayslipsExcel(slips, schemeEmployees)}
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
            <ChartScroll minWidth={Math.max(480, byDept.length * 110)}>
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
            </ChartScroll>
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
            <ChartScroll minWidth={360}>
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
            </ChartScroll>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">各薪酬结构成本</CardTitle>
        </CardContent>
        <CardContent>
          <ChartScroll minWidth={Math.max(480, byStructure.length * 180)}>
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
          </ChartScroll>
        </CardContent>
      </Card>
    </div>
  );
}
