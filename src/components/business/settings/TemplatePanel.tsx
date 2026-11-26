// 设置：模板选择与应用（含重复检测）、参数包管理、数据重置
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import { TEMPLATES } from '@/data/templates';
import { applyTemplate } from '@/services/applyTemplate';
import { getStorageManager } from '@/storage/factory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function TemplatePanel() {
  const { reload, paramPacks } = usePayroll();
  const { schemes, refreshSchemes } = useScheme();
  const [templateId, setTemplateId] = useState<string>('');
  const [resetOpen, setResetOpen] = useState(false);

  async function handleApply() {
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    // 重复检测：同一模板已应用过则提示
    const duplicated = schemes.some((s) => s.templateId === tpl.id);
    if (duplicated) {
      const ok = window.confirm(
        `模板「${tpl.name}」已应用过，再次应用会生成一套独立方案。是否继续？`,
      );
      if (!ok) return;
    }
    await applyTemplate(tpl);
    await refreshSchemes();
    await reload();
    toast.success(`已应用模板「${tpl.name}」，生成独立方案`);
    setTemplateId('');
  }

  async function handleReset() {
    const storage = getStorageManager();
    await storage.clear();
    await refreshSchemes();
    await reload();
    setResetOpen(false);
    toast.success('数据已重置');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">模板与数据</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">应用模板（生成独立方案）</p>
          <div className="flex gap-2">
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="选择模板" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!templateId} onClick={handleApply}>
              应用
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {TEMPLATES.map((t) => {
              const used = schemes.some((s) => s.templateId === t.id);
              return used ? (
                <Badge key={t.id} variant="secondary" className="text-xs">
                  {t.name} 已应用
                </Badge>
              ) : null;
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">个税社保参数包</p>
          {paramPacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无参数包</p>
          ) : (
            paramPacks.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.name}</span>
                {p.isDefault && <Badge variant="outline">默认</Badge>}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="size-4" /> 清空全部数据
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空全部数据</AlertDialogTitle>
            <AlertDialogDescription>
              将删除所有方案、组件、结构、员工、工资条与输入，且不可恢复。确认继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
