// 算薪工作台：按方案隔离，月份选择 + 统一录入虚拟表（含考勤 Excel 导入/整列填充）+ 批量算薪拦截 + 确认/作废
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Copy, Download, Upload } from 'lucide-react';
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
import { collectAllInputFields } from '@/lib/inputFields';
import {
  downloadAttendanceTemplate,
  parseAttendanceExcel,
} from '@/services/excel';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  const [pendingRun, setPendingRun] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [fillKey, setFillKey] = useState<string | null>(null);
  const [fillValue, setFillValue] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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

  // 统一录入字段（external / performance / attendance 声明，去重）
  const inputFields = useMemo(
    () => collectAllInputFields(schemeComponents),
    [schemeComponents],
  );
  const inputKeys = inputFields.map((f) => f.key);
  const labelOf = useMemo(
    () => new Map(inputFields.map((f) => [f.key, f.label])),
    [inputFields],
  );
  const attendanceFields = inputFields.filter((f) => f.group === '考勤');

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
    });
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

  // 清空输入框：回到“未录入”，与主动填 0 区分
  function clearInput(empId: string, key: string) {
    setInputDraft((prev) => {
      if (!prev[empId]) return prev;
      const next = { ...prev[empId] };
      delete next[key];
      return { ...prev, [empId]: next };
    });
  }

  // 未录入项清单
  const missingInputs = useMemo(() => {
    const list: { employee: string; field: string }[] = [];
    for (const emp of activeEmployees) {
      for (const key of inputKeys) {
        if (inputDraft[emp.id]?.[key] === undefined) {
          list.push({ employee: emp.name, field: labelOf.get(key) ?? key });
        }
      }
    }
    return list;
  }, [activeEmployees, inputKeys, inputDraft, labelOf]);

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
    toast.success('录入数据已保存');
  }

  // 考勤 Excel 上传：按工号优先、姓名兜底匹配，写入考勤字段
  async function handleAttendanceUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = await parseAttendanceExcel(file);
      const byNo = new Map(activeEmployees.map((emp) => [emp.empNo, emp]));
      const byName = new Map(activeEmployees.map((emp) => [emp.name, emp]));
      const nextDraft = structuredClone(inputDraft);
      const errors: string[] = [];
      let imported = 0;

      rows.forEach((row, idx) => {
        const lineNo = idx + 2;
        const emp =
          (row['工号'] != null && row['工号'] !== ''
            ? byNo.get(String(row['工号']))
            : undefined) ?? byName.get(String(row['姓名']));
        if (!emp) {
          errors.push(`第 ${lineNo} 行：员工匹配不上（${row['工号'] || row['姓名']}）`);
          return;
        }
        let wrote = false;
        attendanceFields.forEach((f) => {
          const raw = row[f.label];
          if (raw === '' || raw === undefined || raw === null) return;
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            errors.push(`第 ${lineNo} 行 ${emp.name}「${f.label}」不是有效数字`);
            return;
          }
          nextDraft[emp.id] = nextDraft[emp.id] ?? {};
          nextDraft[emp.id][f.key] = num;
          wrote = true;
        });
        if (wrote) imported += 1;
      });

      setInputDraft(nextDraft);
      if (imported > 0) toast.success(`已导入 ${imported} 人考勤，可再手动核对`);
      if (errors.length > 0) setImportErrors(errors);
      if (imported === 0 && errors.length === 0)
        toast.error('未识别到有效考勤数据，请确认模板列是否填写');
    } catch {
      toast.error('考勤文件解析失败，请使用标准模板');
    }
  }

  // 整列填充：把某列统一填成相同值
  function applyFillColumn() {
    const key = fillKey;
    const num = Number(fillValue);
    if (!key || !Number.isFinite(num)) {
      toast.error('请填写有效数字');
      return;
    }
    setInputDraft((prev) => {
      const next = structuredClone(prev);
      for (const emp of activeEmployees) {
        next[emp.id] = next[emp.id] ?? {};
        next[emp.id][key] = num;
      }
      return next;
    });
    setFillKey(null);
    setFillValue('');
    toast.success(`已将「${labelOf.get(key)}」整列填为 ${num}`);
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

  // 点击批量算薪：有未录入先拦截确认
  function handleRunClick() {
    clearSpotlight();
    if (missingInputs.length > 0) setPendingRun(true);
    else void runPayroll();
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

  // 录入虚拟表
  const inputScrollRef = useRef<HTMLDivElement>(null);
  const inputVirtualizer = useVirtualizer({
    count: activeEmployees.length,
    getScrollElement: () => inputScrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 10,
  });

  const nameCol = 120;
  const keyCol = 130;
  const tableWidth = nameCol + keyCol * inputKeys.length;

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
            保存录入
          </Button>
          <Button
            className={spotlight === 'run-payroll' ? 'onboarding-spotlight' : ''}
            onClick={handleRunClick}
          >
            批量算薪
          </Button>
        </div>
      </div>

      {/* 录入表 */}
      <Card
        className={`flex min-h-0 flex-1 flex-col ${
          spotlight === 'input-data' ? 'onboarding-spotlight' : ''
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">月度数据录入</CardTitle>
            <div className="flex items-center gap-1.5">
              {attendanceFields.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      downloadAttendanceTemplate(
                        activeEmployees,
                        attendanceFields,
                      )}
                  >
                    <Download className="size-3.5" /> 下载考勤模板
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-3.5" /> 上传考勤
                  </Button>
                </>
              )}
              {inputKeys.length > 1 && (
                <span className="text-[11px] font-normal text-muted-foreground">
                  列多时可左右滑动
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            带「系数」的列每位员工、每个月都可自由修改，互不影响；空白表示待录入，算薪时按组件缺省值计算。考勤可下载模板批量填写后上传。
          </p>
        </CardHeader>
        <CardContent className="min-h-0 flex-1">
          {inputKeys.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              暂无需要录入的组件，无需填写
            </p>
          ) : (
            <div ref={inputScrollRef} className="h-full overflow-auto">
              <div
                className="sticky top-0 z-10 flex border-b bg-card text-xs font-medium text-muted-foreground"
                style={{ width: tableWidth }}
              >
                <span className="flex items-center px-3" style={{ width: nameCol }}>
                  员工
                </span>
                {inputKeys.map((k) => (
                  <span
                    key={k}
                    className="flex items-center gap-1 px-3"
                    style={{ width: keyCol }}
                  >
                    <span className="truncate">{labelOf.get(k) ?? k}</span>
                    <button
                      type="button"
                      title="整列填充相同值"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setFillKey(k);
                        setFillValue('');
                      }}
                    >
                      <Copy className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div
                style={{
                  height: inputVirtualizer.getTotalSize(),
                  width: tableWidth,
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
                        width: tableWidth,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <span className="flex items-center truncate px-3 text-sm font-medium" style={{ width: nameCol }}>
                        {emp.name}
                      </span>
                      {inputKeys.map((k) => {
                        const raw = inputDraft[emp.id]?.[k];
                        return (
                          <span key={k} className="px-2" style={{ width: keyCol }}>
                            <Input
                              type="number"
                              className="h-8"
                              placeholder="待录入"
                              value={raw === undefined ? '' : raw}
                              onChange={(e) => {
                                if (e.target.value === '')
                                  clearInput(emp.id, k);
                                else
                                  setInput(emp.id, k, parseNumber(e.target.value));
                              }}
                            />
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工资条列表：限制高度并内部滚动，避免条数多时挤压上方录入区 */}
      <Card className="shrink-0">
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
            <div className="max-h-72 space-y-1 overflow-auto pr-1">
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

      {/* 隐藏的文件选择 */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleAttendanceUpload}
      />

      {/* 未录入拦截确认 */}
      <AlertDialog open={pendingRun} onOpenChange={setPendingRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              有 {missingInputs.length} 项数据未录入
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground">
            未录入的字段将按组件设置的缺省值计算。可返回补全，或直接按缺省值继续。
            <ul className="mt-2 space-y-1">
              {missingInputs.slice(0, 5).map((m, i) => (
                <li key={i} className="text-xs">
                  {m.employee} · {m.field}
                </li>
              ))}
              {missingInputs.length > 5 && (
                <li className="text-xs">等共 {missingInputs.length} 项</li>
              )}
            </ul>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingRun(false)}>
              返回录入
            </Button>
            <AlertDialogAction
              onClick={() => {
                setPendingRun(false);
                void runPayroll();
              }}
            >
              按缺省值继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 整列填充弹窗 */}
      <AlertDialog
        open={fillKey !== null}
        onOpenChange={(open) => !open && setFillKey(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              整列填充「{fillKey ? labelOf.get(fillKey) : ''}」
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              输入一个值，将统一填入当前方案全部员工的该列（含已填，会被覆盖）。
            </p>
            <Input
              type="number"
              autoFocus
              value={fillValue}
              onChange={(e) => setFillValue(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setFillKey(null)}>
              取消
            </Button>
            <AlertDialogAction onClick={applyFillColumn}>
              填充
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导入错误弹窗 */}
      <AlertDialog
        open={importErrors.length > 0}
        onOpenChange={(open) => !open && setImportErrors([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {importErrors.length} 条数据未导入
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-56 overflow-auto text-xs text-muted-foreground">
            <ul className="space-y-1">
              {importErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImportErrors([])}>
              知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
