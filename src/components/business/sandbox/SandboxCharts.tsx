// 薪酬测算沙盘图表：固浮比环形、总用工成本 vs 预算上限、部门/结构成本（Tabs 切换）
import type { ReactNode } from 'react';
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
import type { SandboxResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoney } from '@/lib/format';

const PRIMARY = '#0f76a8';
const LIGHT = '#6fb3d2';
const MUTED = '#9aa7b0';

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

export function SandboxCharts({
  result,
  budgetCap,
}: {
  result: SandboxResult;
  budgetCap: number;
}) {
  const { summary, byDepartment, byStructure } = result;

  const pieData = [
    { name: '固定部分', value: summary.fixed },
    { name: '浮动部分', value: summary.floating },
  ];

  const budgetData = [
    { name: '总用工成本', value: summary.totalCost },
    { name: '预算上限', value: budgetCap },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">固浮比（基于应发）</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">总用工成本 vs 预算上限</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartScroll minWidth={360}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={budgetData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                  <Bar dataKey="value" name="金额" fill={PRIMARY} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartScroll>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">分组总用工成本</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="department">
            <TabsList>
              <TabsTrigger value="department">按部门</TabsTrigger>
              <TabsTrigger value="structure">按薪酬结构</TabsTrigger>
            </TabsList>

            <TabsContent value="department">
              <ChartScroll minWidth={Math.max(480, byDepartment.length * 120)}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byDepartment}>
                    <XAxis dataKey="key" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} tickLine={false} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    <Legend />
                    <Bar dataKey="gross" name="应发" fill={PRIMARY} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="employerTotal" name="企业社保" fill={LIGHT} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartScroll>
            </TabsContent>

            <TabsContent value="structure">
              <ChartScroll minWidth={Math.max(480, byStructure.length * 160)}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byStructure} layout="vertical">
                    <XAxis type="number" fontSize={12} tickLine={false} />
                    <YAxis type="category" dataKey="key" fontSize={12} tickLine={false} width={110} />
                    <Tooltip formatter={(v) => formatMoney(Number(v))} />
                    <Bar dataKey="totalCost" name="总用工成本" fill={PRIMARY} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartScroll>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
