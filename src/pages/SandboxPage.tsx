// 薪酬测算沙盘页面：左侧变量控制台，右侧 KPI、图表与模拟明细；纯内存影子计算
import {
  useEffect,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import { runSandbox } from '@/services/sandbox';
import {
  createDefaultAdjustments,
  type SandboxAdjustments,
} from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { AdjustmentPanel } from '@/components/business/sandbox/AdjustmentPanel';
import { SandboxKpi } from '@/components/business/sandbox/SandboxKpi';
import { SandboxCharts } from '@/components/business/sandbox/SandboxCharts';
import { SandboxDetail } from '@/components/business/sandbox/SandboxDetail';

export default function SandboxPage() {
  const { components, structures, employees, paramPacks, loading } = usePayroll();
  const { currentSchemeId } = useScheme();

  const schemeComponents = useMemo(
    () => components.filter((c) => c.schemeId === currentSchemeId),
    [components, currentSchemeId],
  );
  const schemeStructures = useMemo(
    () => structures.filter((s) => s.schemeId === currentSchemeId),
    [structures, currentSchemeId],
  );
  const schemeEmployees = useMemo(
    () =>
      employees.filter(
        (e) => e.schemeId === currentSchemeId && e.status === 'active',
      ),
    [employees, currentSchemeId],
  );
  const paramPack = useMemo(
    () => paramPacks.find((p) => p.isDefault) ?? paramPacks[0],
    [paramPacks],
  );

  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  const [adjustments, setAdjustments] = useState<SandboxAdjustments>(() =>
    createDefaultAdjustments(),
  );

  // 切换方案：重置临时变量
  useEffect(() => {
    setAdjustments(createDefaultAdjustments());
  }, [currentSchemeId]);

  // 基线：全部变量取默认值
  const baseline = useMemo(() => {
    if (!paramPack || schemeEmployees.length === 0) return null;
    return runSandbox({
      components: schemeComponents,
      structures: schemeStructures,
      employees: schemeEmployees,
      paramPack,
      adjustments: createDefaultAdjustments(),
      year,
      month,
    });
  }, [
    schemeComponents,
    schemeStructures,
    schemeEmployees,
    paramPack,
    year,
    month,
  ]);

  // 基线算出后回填预算上限（重置后 budgetCap 为 0）
  useEffect(() => {
    if (!baseline) return;
    setAdjustments((prev) =>
      prev.budgetCap === 0
        ? { ...prev, budgetCap: baseline.summary.totalCost }
        : prev,
    );
  }, [baseline]);

  const deferred = useDeferredValue(adjustments);
  const result = useMemo(() => {
    if (!paramPack || schemeEmployees.length === 0) return null;
    return runSandbox({
      components: schemeComponents,
      structures: schemeStructures,
      employees: schemeEmployees,
      paramPack,
      adjustments: deferred,
      year,
      month,
    });
  }, [
    schemeComponents,
    schemeStructures,
    schemeEmployees,
    paramPack,
    deferred,
    year,
    month,
  ]);

  const patch = (p: Partial<SandboxAdjustments>) =>
    setAdjustments((prev) => ({ ...prev, ...p }));
  const reset = () =>
    setAdjustments({
      ...createDefaultAdjustments(),
      budgetCap: baseline?.summary.totalCost ?? 0,
    });

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
    );
  }
  if (!paramPack) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        请先在设置中准备个税社保参数包
      </p>
    );
  }
  if (!baseline || !result || schemeEmployees.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        当前方案暂无在职员工，无法进行测算
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
      <Card className="h-fit xl:sticky xl:top-0">
        <CardContent className="p-4">
          <AdjustmentPanel
            adjustments={adjustments}
            onChange={patch}
            onReset={reset}
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SandboxKpi summary={result.summary} baseline={baseline.summary} />
        <SandboxCharts result={result} budgetCap={adjustments.budgetCap} />
        <SandboxDetail employees={result.employees} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          口径说明：工资性总用工成本 = 应发 + 企业承担社保公积金，不含福利、教育经费、工会经费等；年度估算（月度×12）未含年终奖、年中调薪与人员增减。模拟仅在内存进行，不写入正式数据。
        </p>
      </div>
    </div>
  );
}
