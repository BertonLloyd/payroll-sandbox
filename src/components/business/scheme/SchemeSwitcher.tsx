// 全局方案切换器：切换方案、重命名、整套删除（级联）
import { useEffect, useState } from 'react';
import { Check, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import {
  deleteSchemeCascade,
  renameScheme,
} from '@/services/schemeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export function SchemeSwitcher() {
  const {
    components,
    structures,
    employees,
    refresh: refreshPayroll,
  } = usePayroll();
  const {
    schemes,
    currentScheme,
    currentSchemeId,
    setCurrentScheme,
    refresh: refreshSchemes,
  } = useScheme();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 当前方案数据量（同步统计）
  const stats = {
    components: components.filter((c) => c.schemeId === currentSchemeId).length,
    structures: structures.filter((s) => s.schemeId === currentSchemeId).length,
    employees: employees.filter((e) => e.schemeId === currentSchemeId).length,
  };

  useEffect(() => {
    if (renameOpen && currentScheme) setRenameValue(currentScheme.name);
  }, [renameOpen, currentScheme]);

  async function handleRename() {
    if (!currentScheme) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error('方案名称不能为空');
      return;
    }
    await renameScheme(currentScheme.id, name);
    await refreshSchemes();
    setRenameOpen(false);
    toast.success('方案已重命名');
  }

  async function handleDelete() {
    if (!currentScheme) return;
    const id = currentScheme.id;
    await deleteSchemeCascade(id);
    await Promise.all([refreshSchemes(), refreshPayroll]);
    setDeleteOpen(false);
    toast.success('方案已整套删除');
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 font-medium">
            <span className="max-w-[200px] truncate">
              {currentScheme ? currentScheme.name : '暂无方案'}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>切换方案</DropdownMenuLabel>
          {schemes.map((s) => (
            <DropdownMenuItem
              key={s.id}
              className="gap-2"
              onSelect={() => setCurrentScheme(s.id)}
            >
              <span className="flex-1 truncate">{s.name}</span>
              {s.id === currentSchemeId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!currentScheme}
            onSelect={() => setRenameOpen(true)}
          >
            <Pencil className="size-4" /> 重命名
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!currentScheme}
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" /> 删除整套方案
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 重命名 */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名方案</DialogTitle>
            <DialogDescription>
              修改当前方案的显示名称，不影响方案内数据。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            autoFocus
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除整套方案</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除「{currentScheme?.name}」及其全部数据：
              {stats.components} 个组件、{stats.structures} 个结构、
              {stats.employees} 名员工，以及对应的工资条和外部输入。
              此操作不可恢复，确认删除？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
