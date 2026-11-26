// 首页：模板起步（防重复）+ 我的方案（打开/重命名/删除）+ 快速导航
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  Layers,
  Pencil,
  Puzzle,
  Trash2,
  Users,
} from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import {
  createSchemeFromTemplate,
  deleteSchemeCascade,
  renameScheme,
} from '@/services/schemeService';
import type { PayTemplate, Scheme } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';

const TEMPLATE_CARDS = [
  { category: 'general-service', label: '通用服务业', desc: '固定+绩效+津贴，适合职能岗位' },
  { category: 'chain-store', label: '连锁门店', desc: '低固定+业绩提成，门店/口腔场景' },
  { category: 'sales', label: '销售型', desc: '低底薪+阶梯提成，高浮动团队' },
];

export default function HomePage() {
  const { components, structures, employees, templates, refresh: refreshPayroll } =
    usePayroll();
  const { schemes, setCurrentScheme, refresh: refreshSchemes } = useScheme();
  const navigate = useNavigate();

  // 防重复确认：待处理模板
  const [existingTemplate, setExistingTemplate] = useState<PayTemplate | null>(
    null,
  );
  // 重命名
  const [renameTarget, setRenameTarget] = useState<Scheme | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // 删除
  const [deleteTarget, setDeleteTarget] = useState<Scheme | null>(null);

  useEffect(() => {
    if (renameTarget) setRenameValue(renameTarget.name);
  }, [renameTarget]);

  // 应用模板创建方案
  async function buildFromTemplate(template: PayTemplate) {
    const scheme = await createSchemeFromTemplate(template);
    await Promise.all([refreshSchemes(), refreshPayroll()]);
    setCurrentScheme(scheme.id);
    toast.success(`已创建方案：${scheme.name}`);
    navigate('/payroll');
  }

  function handleTemplateClick(template: PayTemplate | undefined) {
    if (!template) return;
    const dup = schemes.find((s) => s.templateId === template.id);
    if (dup) {
      setExistingTemplate(template); // 已存在，提示选择
    } else {
      buildFromTemplate(template);
    }
  }

  function openScheme(scheme: Scheme) {
    setCurrentScheme(scheme.id);
    navigate('/payroll');
  }

  async function handleRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error('方案名称不能为空');
      return;
    }
    await renameScheme(renameTarget.id, name);
    await refreshSchemes();
    setRenameTarget(null);
    toast.success('方案已重命名');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteSchemeCascade(deleteTarget.id);
    await Promise.all([refreshSchemes(), refreshPayroll()]);
    setDeleteTarget(null);
    toast.success('方案已删除');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* 模板起步 */}
      <div>
        <h2 className="text-xl font-bold">选择一套模板快速起步</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          每套模板生成独立方案，组件、结构、员工与工资条互不干扰；同一模板重复创建会先提示。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {TEMPLATE_CARDS.map((card) => {
          const template = templates.find((t) => t.category === card.category);
          return (
            <Card key={card.category} className="hover:border-primary">
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="font-semibold">{card.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.desc}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleTemplateClick(template)}
                >
                  使用此模板
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 我的方案 */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">我的方案（{schemes.length}）</h3>
        {schemes.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            暂无方案，请从上方选择模板创建
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {schemes.map((scheme) => {
              const stats = {
                components: components.filter((c) => c.schemeId === scheme.id).length,
                structures: structures.filter((s) => s.schemeId === scheme.id).length,
                employees: employees.filter((e) => e.schemeId === scheme.id).length,
              };
              return (
                <Card key={scheme.id}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{scheme.name}</p>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setRenameTarget(scheme)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          onClick={() => setDeleteTarget(scheme)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Puzzle className="size-3" /> {stats.components}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="size-3" /> {stats.structures}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" /> {stats.employees}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openScheme(scheme)}
                    >
                      打开方案
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate('/components')}>
          <Puzzle className="size-4" /> 组件库
        </Button>
        <Button variant="outline" onClick={() => navigate('/payroll')}>
          <Calculator className="size-4" /> 算薪工作台
        </Button>
      </div>

      {/* 防重复确认 */}
      <AlertDialog
        open={!!existingTemplate}
        onOpenChange={(o) => !o && setExistingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>该模板已创建过方案</AlertDialogTitle>
            <AlertDialogDescription>
              检测到「{existingTemplate?.name}」已存在对应方案。可直接打开现有方案，
              或仍要基于该模板再新建一份独立方案。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const tpl = existingTemplate;
                setExistingTemplate(null);
                const dup = schemes.find((s) => s.templateId === tpl?.id);
                if (dup) openScheme(dup);
              }}
            >
              打开现有方案
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                const tpl = existingTemplate;
                setExistingTemplate(null);
                if (tpl) buildFromTemplate(tpl);
              }}
            >
              再建一份
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重命名 */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名方案</DialogTitle>
            <DialogDescription>修改方案显示名称，不影响方案内数据。</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            autoFocus
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              取消
            </Button>
            <Button onClick={handleRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除整套方案</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除「{deleteTarget?.name}」及其全部组件、结构、员工、工资条与外部输入，
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
    </div>
  );
}
