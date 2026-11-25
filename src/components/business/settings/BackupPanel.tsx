// 备份与数据面板：全量备份/恢复、Excel 导出
import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { usePayroll } from '@/store';
import { downloadBackup, restoreBackup } from '@/services/backup';
import { exportEmployeesExcel } from '@/services/excel';
import { Button } from '../../ui/button';
import { toast } from 'sonner';

export function BackupPanel({ onRestored }: { onRestored(): void }) {
  const { employees } = usePayroll();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    try {
      await restoreBackup(file);
      toast.success('备份已恢复，正在刷新数据');
      onRestored();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '恢复失败');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => downloadBackup()}>
          <Download className="size-4" /> 下载全量备份
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> 从备份恢复
        </Button>
        <Button
          variant="outline"
          onClick={() => exportEmployeesExcel(employees)}
        >
          导出员工 Excel
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <p className="text-xs text-muted-foreground">
        数据仅保存在当前浏览器，清理缓存前请先下载备份；恢复会按备份内容覆盖对应数据。
      </p>
    </div>
  );
}
