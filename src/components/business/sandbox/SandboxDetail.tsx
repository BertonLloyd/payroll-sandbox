// 薪酬测算沙盘模拟明细：员工模拟结果表，点击行下钻查看单人模拟工资条
import { useState } from 'react';
import type { SandboxEmployeeResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/format';

export function SandboxDetail({
  employees,
}: {
  employees: SandboxEmployeeResult[];
}) {
  const [selected, setSelected] = useState<SandboxEmployeeResult | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">模拟明细（点击行查看工资条）</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>工号</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>部门</TableHead>
              <TableHead>薪酬结构</TableHead>
              <TableHead className="text-right">应发</TableHead>
              <TableHead className="text-right">企业社保</TableHead>
              <TableHead className="text-right">总用工成本</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((r) => (
              <TableRow
                key={r.employeeId}
                className="cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <TableCell className="tabular-nums">{r.empNo}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.department}</TableCell>
                <TableCell>{r.structureName}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(r.slip.gross)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(r.employerTotal)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(r.totalCost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog
          open={selected !== null}
          onOpenChange={(open) => !open && setSelected(null)}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{selected?.name} 模拟工资条</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {selected.department} · {selected.position} ·{' '}
                  {selected.structureName}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.slip.lines.map((line) => (
                      <TableRow key={line.componentId}>
                        <TableCell>{line.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>应发</span>
                    <span className="tabular-nums">
                      {formatMoney(selected.slip.gross)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>企业承担社保公积金</span>
                    <span className="tabular-nums">
                      {formatMoney(selected.employerTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>工资性总用工成本</span>
                    <span className="tabular-nums">
                      {formatMoney(selected.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>实发</span>
                    <span className="tabular-nums">
                      {formatMoney(selected.slip.net)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
