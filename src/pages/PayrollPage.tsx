// 算薪工作台：按方案隔离，月份选择 + 外部输入虚拟表 + 批量算薪 + 一键确认/单条确认/作废
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import { getRepositories } from '@/repositories/factory';
import type {
  Employee,
  PaySlip,
  PaySlipStatus,
} from '@/types';
import { calcPayroll } from '@/engine/calcPayroll';
import { formatMoney, parseNumber } from '@/lib/format';
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
import { useOnboarding } from '@/components/business/onboarding';
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
  const { currentSchemeId } = useScheme();
  const { spotlight, clearSpotlight, markPayrollRun } = useOnboarding();
  const repos = useMemo(() => getRepositories(), []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [inputDraft, setInputDraft] = useState<
    Record<string, Record<string, number>>
  >({});
  const [slips, setSlips] = useState<PaySlip[]>([]);
  const [detail, setDetail] = useState<PaySlip | null>(null);

  // 当前方案下的组件/结构/员工
  const schemeComponents = useMemo(
    () => components.filter((c) => c.schemeId === currentSchemeId),
    [components, currentSchemeId],
  );
  const schemeStructures = useMemo(
    () => structures.filter((s) => s.schemeId === currentSchemeId),
    [structures, currentSchemeId],
  );
  const activeEmployees = useMemo(
    () =>
      employees.filter(
        (e) => e.schemeId === currentSchemeId && e.status === 'active',
      ),
    [employees, currentSchemeId],
  );

  // external 组件所需输入 key
  const inputKeys = useMemo(
    () =>
      [
        ...new Set(
          schemeComponents
            .filter((c) => c.calcConfig.kind === 'external')
            .map((c) =>
              (c.calcConfig as { inputKey: string }).inputKey,
            ),
        ),
      ].filter(Boolean),
    [schemeComponents],
  );

  // external 输入 key -> 中文显示名（缺省回退 key）
  const inputLabels = useMemo(() => {
    const map = new Map<string, string>();
    schemeComponents
      .filter((c) => c.calcConfig.kind === 'external')
      .forEach((c) => {
        const cfg = c.calcConfig as { inputKey: string; label?: string };
        if (cfg.inputKey && cfg.label) map.set(cfg.inputKey, cfg.label);
      });
    return map;
  }, [schemeComponents]);

  // 月份或方案切换时加载当月、当前方案的工资条与已存输入
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [periodSlips, periodInputs] = await Promise.all([
        repos.paySlips.listPeriod(year, month),
        repos.monthlyInputs.listPeriod(year, month),
      ]);
      if (cancelled) return;
      setSlips(
        periodSlips.filter((s) => s.schemeId === currentSchemeId),
      );
      const draft: Record<string, Record<string, number>> = {};
      periodInputs
        .filter((mi) => mi.schemeId === currentSchemeId)
        .forEach((mi) => {
          draft[mi.employeeId] = { ...mi.values };
        });
      setInputDraft(draft);
    })();
    return () => {
      cancelled = true;
    };
  }, [year, month, repos, currentSchemeId]);

  function setInput(empId: string, key: string, value: number) {
    setInputDraft((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [key]: value },
    }));
  }

  async function saveInputs() {
    if (!currentSchemeId) return;
    for (const [empId, values] of Object.entries(inputDraft)) {
      await repos.monthlyInputs.upsert(
        year,
        month,
        currentSchemeId,
        empId,
        values,
      );
    }
    toast.success('外部输入已保存');
  }

  async function runPayroll() {
    if (!currentSchemeId) return;
    const pack = paramPacks.find((p) => p.isDefault) ?? paramPacks[0];
    if (!pack) {
      toast.error('请先在设置中准备个税社保参数包');
      return;
    }

    // 当月全量工资条：保留其他方案的数据不动
    const allPeriodSlips = await repos.paySlips.listPeriod(year, month);
    const otherSlips = allPeriodSlips.filter(
      (s) => s.schemeId !== currentSchemeId,
    );

    // 当前方案已确认的工资条锁定保留
    const confirmed = new Map(
      slips
        .filter((s) => s.status === 'confirmed')
        .map((s) => [s.employeeId, s]),
    );
    const next: PaySlip[] = [];
    let failures = 0;

    for (const emp of activeEmployees) {
      const kept = confirmed.get(emp.id);
      if (kept) {
        next.push(kept);
        continue;
      }
      const structure = schemeStructures.find((s) => s.id === emp.structureId);
      if (!structure) {
        failures += 1;
        continue;
      }
      try {
        next.push(
          calcPayroll({
            schemeId: currentSchemeId,
            employee: emp,
            structure,
            components: schemeComponents,
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

    // 合并其他方案后整体写回
    await repos.paySlips.replacePeriod(year, month, [
      ...otherSlips,
      ...next,
    ]);
    setSlips(next);
    if (next.length > 0) markPayrollRun();
    toast.success(
      `已生成 ${next.length} 条工资条${failures ? `，${failures} 人未生成` : ''}`,
    );
  }

  async function confirmSlip(id: string) {
    const all = await repos.paySlips.confirm(year, month, id);
    setSlips(all.filter((s) => s.schemeId === currentSchemeId));
  }

  async function confirmAll() {
    const all = await repos.paySlips.confirmAll(year, month);
    setSlips(all.filter((s) => s.schemeId === currentSchemeId));
    toast.success('当月工资条已全部确认');
  }

  async function voidSlip(id: string) {
    const all = await repos.paySlips.voidSlip(year, month, id);
    setSlips(all.filter((s) => s.schemeId === currentSchemeId));
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

  const draftCount = slips.filter((s) => s.status === 'draft').length;

  if (!currentSchemeId) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        暂无方案，请先回到首页选择模板或新建空白方案
      </p>
    );
  }

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
          <Button
            className={spotlight === 'run-payroll' ? 'onboarding-spotlight' : ''}
            onClick={() => {
              clearSpotlight();
              runPayroll();
            }}
          >
            批量算薪
          </Button>
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
                    {inputLabels.get(k) ?? k}
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              工资条（{year}-{String(month).padStart(2, '0')}）
            </CardTitle>
            {draftCount > 0 && (
              <Button size="sm" onClick={confirmAll}>
                一键确认（{draftCount} 条草稿）
              </Button>
            )}
          </div>
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
