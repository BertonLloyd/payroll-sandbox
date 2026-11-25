// 容量探测：启动与写入前检查，接近阈值预警
import type { CapacityEstimate } from './StorageAdapter';

export async function estimateCapacity(): Promise<CapacityEstimate> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const e = await navigator.storage.estimate();
    const quota = e.quota ?? 0;
    const usage = e.usage ?? 0;
    return { quota, usage, available: quota - usage, supported: true };
  }
  return { quota: 0, usage: 0, available: 0, supported: false };
}

// 使用率阈值：达到即预警（不阻断，提示备份/清理）
export const WARN_RATIO = 0.8;

export async function getUsageRatio(): Promise<number> {
  const c = await estimateCapacity();
  if (!c.supported || c.quota === 0) return 0;
  return c.usage / c.quota;
}
