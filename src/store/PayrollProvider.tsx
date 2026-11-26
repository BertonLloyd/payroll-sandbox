// 全局数据 store：异步加载、操作先持久化再同步本地状态；repository 抛错则界面不变更
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type {
  AuditFields,
  Employee,
  PayComponent,
  PayStructure,
  PayTemplate,
  TaxParamPack,
} from '../types';
import { BaseRepository } from '../repositories/BaseRepository';
import { getRepositories } from '../repositories/factory';
import { ensureSeedData } from '../data/seed';
import { runMigrations } from '../services/migration';

interface EntityOps<T extends AuditFields> {
  create(input: Omit<T, keyof AuditFields>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  restore(id: string): Promise<T>;
}

function buildOps<T extends AuditFields>(
  repo: BaseRepository<T>,
  setItems: Dispatch<SetStateAction<T>>,
): EntityOps<T> {
  return {
    async create(input) {
      const e = await repo.create(input);
      setItems((p) => [...p, e]);
      return e;
    },
    async update(id, patch) {
      const e = await repo.update(id, patch);
      setItems((p) => p.map((x) => (x.id === id ? e : x)));
      return e;
    },
    async softDelete(id) {
      await repo.softDelete(id);
      setItems((p) => p.filter((x) => x.id !== id));
    },
    async hardDelete(id) {
      await repo.hardDelete(id);
      setItems((p) => p.filter((x) => x.id !== id));
    },
    async restore(id) {
      const e = await repo.restore(id);
      setItems((p) =>
        p.some((x) => x.id === id)
          ? p.map((x) => (x.id === id ? e : x))
          : [...p, e],
      );
      return e;
    },
  };
}

interface PayrollContextValue {
  loading: boolean;
  error: string | null;
  components: PayComponent[];
  structures: PayStructure[];
  employees: Employee[];
  templates: PayTemplate[];
  paramPacks: TaxParamPack[];
  componentOps: EntityOps<PayComponent>;
  structureOps: EntityOps<PayStructure>;
  employeeOps: EntityOps<Employee>;
  templateOps: EntityOps<PayTemplate>;
  paramPackOps: EntityOps<TaxParamPack>;
  refresh(): Promise<void>;
}

const PayrollContext = createContext<PayrollContextValue | null>(null);

export function PayrollProvider({ children }: { children: ReactNode }) {
  const repos = useMemo(() => getRepositories(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [components, setComponents] = useState<PayComponent[]>([]);
  const [structures, setStructures] = useState<PayStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<PayTemplate[]>([]);
  const [paramPacks, setParamPacks] = useState<TaxParamPack[]>([]);

  const refresh = useMemo(
    () => async () => {
      const [c, s, e, t, p] = await Promise.all([
        repos.components.list(),
        repos.structures.list(),
        repos.employees.list(),
        repos.templates.list(),
        repos.paramPacks.list(),
      ]);
      setComponents(c);
      setStructures(s);
      setEmployees(e);
      setTemplates(t);
      setParamPacks(p);
    },
    [repos],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSeedData();
        await runMigrations();
        await refresh();
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const componentOps = useMemo(
    () => buildOps(repos.components, setComponents),
    [repos],
  );
  const structureOps = useMemo(
    () => buildOps(repos.structures, setStructures),
    [repos],
  );
  const employeeOps = useMemo(
    () => buildOps(repos.employees, setEmployees),
    [repos],
  );
  const templateOps = useMemo(
    () => buildOps(repos.templates, setTemplates),
    [repos],
  );
  const paramPackOps = useMemo(
    () => buildOps(repos.paramPacks, setParamPacks),
    [repos],
  );

  const value: PayrollContextValue = {
    loading,
    error,
    components,
    structures,
    employees,
    templates,
    paramPacks,
    componentOps,
    structureOps,
    employeeOps,
    templateOps,
    paramPackOps,
    refresh,
  };

  return (
    <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>
  );
}

export function usePayroll(): PayrollContextValue {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error('usePayroll 必须在 PayrollProvider 内使用');
  return ctx;
}
