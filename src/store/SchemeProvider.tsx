// 方案上下文：加载方案列表、维护当前方案（持久化）、失效自动回退
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getRepositories } from '../repositories/factory';
import { scopedStorage } from '../lib/storage';
import type { Scheme } from '../types';

const CURRENT_SCHEME_KEY = 'currentScheme';

interface SchemeContextValue {
  schemes: Scheme[];
  currentSchemeId: string | null;
  currentScheme: Scheme | null;
  loading: boolean;
  setCurrentScheme(id: string): void;
  refresh(): Promise<Scheme[]>;
}

const SchemeContext = createContext<SchemeContextValue | null>(null);

export function SchemeProvider({ children }: { children: ReactNode }) {
  const repos = useMemo(() => getRepositories(), []);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [currentSchemeId, setCurrentSchemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<Scheme[]> => {
    const list = await repos.schemes.list();
    setSchemes(list);
    return list;
  }, [repos]);

  // 首次加载：恢复上次选择，失效则回退到第一个方案
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await repos.schemes.list();
      if (cancelled) return;
      setSchemes(list);
      const saved = scopedStorage.getItem(CURRENT_SCHEME_KEY);
      if (saved && list.some((s) => s.id === saved)) {
        setCurrentSchemeId(saved);
      } else {
        setCurrentSchemeId(list[0]?.id ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repos]);

  // 方案被删除后，当前选择失效则自动回退
  useEffect(() => {
    if (loading) return;
    if (currentSchemeId && !schemes.some((s) => s.id === currentSchemeId)) {
      const next = schemes[0]?.id ?? null;
      setCurrentSchemeId(next);
      if (next) scopedStorage.setItem(CURRENT_SCHEME_KEY, next);
      else scopedStorage.removeItem(CURRENT_SCHEME_KEY);
    }
  }, [schemes, currentSchemeId, loading]);

  const setCurrentScheme = useCallback((id: string) => {
    setCurrentSchemeId(id);
    scopedStorage.setItem(CURRENT_SCHEME_KEY, id);
  }, []);

  const currentScheme =
    schemes.find((s) => s.id === currentSchemeId) ?? null;

  const value: SchemeContextValue = {
    schemes,
    currentSchemeId,
    currentScheme,
    loading,
    setCurrentScheme,
    refresh,
  };

  return (
    <SchemeContext.Provider value={value}>{children}</SchemeContext.Provider>
  );
}

export function useScheme(): SchemeContextValue {
  const ctx = useContext(SchemeContext);
  if (!ctx) throw new Error('useScheme 必须在 SchemeProvider 内使用');
  return ctx;
}
