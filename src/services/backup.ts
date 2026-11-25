// 全量备份/恢复：JSON 文件下载与导入，数据不离开本机
import { getStorageManager } from '../storage/factory';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

export async function downloadBackup(): Promise<void> {
  const payload: BackupFile = {
    app: 'payroll-sandbox',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: await getStorageManager().exportAll(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `薪酬沙盘备份-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(file: File): Promise<void> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('文件不是有效的 JSON');
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('备份文件格式不正确');
  }
  await getStorageManager().importAll(parsed.data);
}
