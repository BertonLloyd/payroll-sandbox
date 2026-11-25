/**
 * 轻量 localStorage 封装
 * 使用固定前缀实现多实例隔离，前缀可通过 VITE_STORAGE_PREFIX 配置
 */

const PREFIX = import.meta.env.VITE_STORAGE_PREFIX || 'hr-plan:';

function getKey(key: string): string {
  return `${PREFIX}${key}`;
}

export const scopedStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(getKey(key));
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(getKey(key), value);
    } catch {
      // ignore quota errors
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(getKey(key));
    } catch {
      // ignore
    }
  },

  clear(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};
