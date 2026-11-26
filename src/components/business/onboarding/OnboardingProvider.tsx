// 新手向导全局状态：4 步任务清单，完成情况由真实数据自动判定；跳过/算薪状态持久化
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePayroll } from '@/store';

export type SpotlightKey =
  | 'new-component'
  | 'new-structure'
  | 'new-employee'
  | 'run-payroll';

interface StepDef {
  id: string;
  title: string;
  hint: string;
  path: string;
  spotlight: SpotlightKey;
}

export interface OnboardingStep extends StepDef {
  done: boolean;
}

interface OnboardingContextValue {
  steps: OnboardingStep[];
  allDone: boolean;
  open: boolean;
  spotlight: SpotlightKey | null;
  openGuide(): void;
  closeGuide(): void;
  dismiss(): void;
  goTo(step: StepDef): void;
  clearSpotlight(): void;
  markPayrollRun(): void;
}

const STEP_DEFS: StepDef[] = [
  {
    id: 'component',
    title: '建立薪酬组件',
    hint: '定义基本工资、奖金等计算项',
    path: '/components',
    spotlight: 'new-component',
  },
  {
    id: 'structure',
    title: '组建薪酬结构',
    hint: '把组件按顺序组合成结构',
    path: '/structures',
    spotlight: 'new-structure',
  },
  {
    id: 'employee',
    title: '维护员工信息',
    hint: '录入员工并挂接薪酬结构',
    path: '/employees',
    spotlight: 'new-employee',
  },
  {
    id: 'payroll',
    title: '算薪并生成工资表',
    hint: '批量算薪、确认工资条',
    path: '/payroll',
    spotlight: 'run-payroll',
  },
];

const STORAGE_KEY = 'payroll-sandbox-onboarding';

interface PersistedState {
  dismissed?: boolean;
  hasRunPayroll?: boolean;
}

function readPersisted(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : {};
  } catch {
    return {};
  }
}

function writePersisted(state: PersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时向导仍可在当前会话使用
  }
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { components, structures, employees } = usePayroll();
  const navigate = useNavigate();
  const location = useLocation();

  const initial = useMemo(readPersisted, []);
  const [dismissed, setDismissed] = useState(initial.dismissed ?? false);
  const [hasRunPayroll, setHasRunPayroll] = useState(
    initial.hasRunPayroll ?? false,
  );
  const [open, setOpen] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightKey | null>(null);

  const steps = useMemo<OnboardingStep[]>(
    () =>
      STEP_DEFS.map((def) => ({
        ...def,
        done:
          (def.id === 'component' && components.length > 0) ||
          (def.id === 'structure' && structures.length > 0) ||
          (def.id === 'employee' && employees.length > 0) ||
          (def.id === 'payroll' && hasRunPayroll),
      })),
    [components.length, structures.length, employees.length, hasRunPayroll],
  );

  const allDone = useMemo(() => steps.every((s) => s.done), [steps]);

  // 首次进入：未跳过且存在未完成步骤时自动弹出
  useEffect(() => {
    if (!dismissed && steps.some((s) => !s.done)) setOpen(true);
    // 仅在挂载时判定一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearSpotlight = useCallback(() => setSpotlight(null), []);

  // 离开高亮目标页时清除高亮
  useEffect(() => {
    if (!spotlight) return;
    const target = STEP_DEFS.find((d) => d.spotlight === spotlight);
    if (target && location.pathname !== target.path) setSpotlight(null);
  }, [location.pathname, spotlight]);

  const persist = useCallback(
    (patch: Partial<PersistedState>) => {
      writePersisted({
        dismissed,
        hasRunPayroll,
        ...patch,
      });
    },
    [dismissed, hasRunPayroll],
  );

  const openGuide = useCallback(() => setOpen(true), []);
  const closeGuide = useCallback(() => setOpen(false), []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setOpen(false);
    persist({ dismissed: true });
  }, [persist]);

  const goTo = useCallback(
    (step: StepDef) => {
      setSpotlight(step.spotlight);
      navigate(step.path);
      setOpen(true);
    },
    [navigate],
  );

  const markPayrollRun = useCallback(() => {
    setHasRunPayroll(true);
    persist({ hasRunPayroll: true });
  }, [persist]);

  const value: OnboardingContextValue = {
    steps,
    allDone,
    open,
    spotlight,
    openGuide,
    closeGuide,
    dismiss,
    goTo,
    clearSpotlight,
    markPayrollRun,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding 必须在 OnboardingProvider 内使用');
  return ctx;
}
