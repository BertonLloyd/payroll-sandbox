// 算薪工作台：月份选择 + 外部输入虚拟表 + 批量算薪 + 工资条确认/作废
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePayroll } from '@/store';
import { getRepositories } from '@/repositories/factory';
import type {
  Employee,
  PaySlip,
  PaySlipStatus,
} from '@/types';
import { calcPayroll } from '@/engine/calcPayroll';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PayslipDetailDialog } from '@/components/business/payslip/PayslipDetailDialog';
import { parseNumber } from '@/lib/format';
import { toast } from 'sonner';

const STATUS_LABEL: Record<PaySlipStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  void: '已作废',
};

const ROW_H = 44;

export default function PayrollPage() {
  const {
    employees,
    structures,
    components,
    paramPacks,
  } = usePayroll();
  const repos = useMemo(() => getRepositories(), []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [inputDraft, setInputDraft] = useState<
    Record<string, Record<string, number>>
  >({});
  const [slips, setSlips] = useState<PaySlip[]>([]);
  const [detail, setDetail] = useState<PaySlip | null>(null);

  // external 组件所需输入 key
  const inputKeys = useMemo(
    () =>
      [
        ...new Set(
          components
            .filter((c) => c.calcConfig.kind === 'external')
            .map((c) =>
              (c.calcConfig as { inputKey: string }).inputKey,
            ),
        ),
      ].filter(Boolean),
    [components],
  );

  // 月份切换时加载当月工资条与已存输入
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [periodSlips, periodInputs] = await Promise.all([
        repos.paySlips.listPeriod(year, month),
        repos.monthlyInputs.listPeriod(year, month),
      ]);
      if (cancelled) return;
      setSlips(periodSlips);
      const draft: Record<string, Record<string, number>> = {};
      periodInputs.forEach((mi) => {
        draft[mi.employeeId] = { ...mi.values };
      });
      setInputDraft(draft);
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, repos]);

  const activeEmployees = employees.filter((e) => e.status === 'active');

  function setInput(empId: string, key: string, value: number) {
    setInputDraft((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [key]: value },
    }));
  }

  async function saveInputs() {
    for (const [empId, values] of Object.entries(inputDraft)) {
      await repos.monthlyInputs.upsert(year, month, empId, values);
    }
    toast.success('外部输入已保存');
  }

  async function runPayroll() {
    const pack = paramPacks.find((p) => p.isDefault) ?? paramPacks[0];
    if (!pack) {
      toast.error('请先在设置中准备个税社保参数包');
      return;
    }
    const confirmed = new Map(
      slips.filter((s) => s.status === 'confirmed').map((s) => [s.employeeId, s]),
    );
    const next: PaySlip[] = [];
    let failures = 0;

    for (const emp of activeEmployees) {
      const kept = confirmed.get(emp.id);
      if (kept) {
        next.push(kept);
        continue;
      }
      const structure = structures.find((s) => s.id === emp.structureId);
      if (!structure) {
        failures += 1;
        continue;
      }
      try {
        next.push(
          calcPayroll({
            employee: emp,
            structure,
            components,
            paramPack: pack,
            inputValues: inputDraft[emp.id] ?? {},
            year,
            month,
          }),
        );
      } catch (e) {
        failures += 1;
        toast.error(
          `${emp.name} 算薪失败：${e instanceof Error ? e.message : ''}`,
        );
      }
    }

    await repos.paySlips.replacePeriod(year, month, next);
    setSlips(next);
    toast.success(
      `已生成 ${next.length} 条工资条${failures ? `，${failures} 人未生成` : ''}`,
    );
  }

  async function confirmSlip(id: string) {
    setSlips(await repos.paySlips.confirm(year, month, id));
  }
  async function voidSlip(id: string) {
    setSlips(await repos.paySlips.voidSlip(year, month, id));
  }

  // 外部输入虚拟表
  const inputScrollRef = useRef<HTMLDivElement>(null);
  const inputVirtualizer = useVirtualizer({
    count: activeEmployees.length,
    getScrollElement: () => inputScrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 10,
  });

  const nameCol = 130;
  const keyCol = 130;

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
              (y) => (
                <SelectItem key={y} value={String(y)}>
                  {y} 年
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m} 月
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={saveInputs}>
            保存输入
          </Button>
          <Button onClick={runPayroll}>批量算薪</Button>
        </div>
      </div>

      {/* 外部输入表 */}
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">月度外部输入</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          {inputKeys.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              暂无外部输入型组件，无需录入
            </p>
          ) : (
            <div ref={inputScrollRef} className="h-full overflow-auto">
              <div
                className="sticky top-0 z-10 flex border-b bg-card text-xs font-medium text-muted-foreground"
                style={{ width: nameCol + keyCol * inputKeys.length }}
              >
                <span className="flex items-center px-3" style={{ width: nameCol }}>
                  员工
                </span>
                {inputKeys.map((k) => (
                  <span key={k} className="flex items-center px-3" style={{ width: keyCol }}>
                    {k}
                  </span>
                ))}
              </div>
              <div
                style={{
                  height: inputVirtualizer.getTotalSize(),
                  width: nameCol + keyCol * inputKeys.length,
                  position: 'relative',
                }}
              >
                {inputVirtualizer.getVirtualItems().map((vi) => {
                  const emp: Employee = activeEmployees[vi.index];
                  return (
                    <div
                      key={emp.id}
                      className="absolute left-0 flex border-b"
                      style={{
                        height: ROW_H,
                        width: nameCol + keyCol * inputKeys.length,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <span className="flex items-center truncate px-3 text-sm font-medium" style={{ width: nameCol }}>
                        {emp.name}
                      </span>
                      {inputKeys.map((k) => (
                        <span key={k} className="px-2" style={{ width: keyCol }}>
                          <Input
                            type="number"
                            className="h-8"
                            value={inputDraft[emp.id]?.[k] ?? 0}
                            onChange={(e) =>
                              setInput(emp.id, k, parseNumber(e.target.value))
                            }
                          />
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工资条列表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            工资条（{year}-{String(month).padStart(2, '0')}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slips.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              尚未算薪，点击右上角批量算薪
            </p>
          ) : (
            <div className="space-y-1">
              {slips.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="w-24 font-medium">
                    {employeeMap.get(s.employeeId)?.name ?? '—'}
                  </span>
                  <Badge variant="outline">{STATUS_LABEL[s.status]}</Badge>
                  <span className="ml-auto text-muted-foreground">
                    应发 {formatMoney(s.gross)} · 个税 {formatMoney(s.tax)} ·
                    实发 <span className="font-semibold text-foreground">{formatMoney(s.net)}</span>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setDetail(s)}>
                    明细
                  </Button>
                  {s.status === 'draft' && (
                    <Button size="sm" onClick={() => confirmSlip(s.id)}>
                      确认
                    </Button>
                  )}
                  {s.status !== 'void' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => voidSlip(s.id)}
                    >
                      作废
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipDetailDialog
        slip={detail}
        employeeName={detail ? employeeMap.get(detail.employeeId)?.name ?? '' : ''}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onConfirm={() => detail && confirmSlip(detail.id)}
        onVoid={() => detail && voidSlip(detail.id)}
      />
    </div>
  );
}
