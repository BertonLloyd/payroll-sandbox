// 组件库：按加项/扣项分组展示，计算方式显示规则摘要，支持新建、编辑、软删
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import type { PayComponent } from '@/types';
import { describeCalcConfig } from '@/lib/componentDescribe';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { ComponentFormDialog } from '@/components/business/componentform/ComponentFormDialog';
import { useOnboarding } from '@/components/business/onboarding';
import { toast } from 'sonner';

function GroupTable({
  title,
  items,
  resolveName,
  onEdit,
  onDelete,
}: {
  title: string;
  items: PayComponent[];
  resolveName(id: string): string | undefined;
  onEdit(c: PayComponent): void;
  onDelete(c: PayComponent): void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {title}（{items.length}）
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>计算规则</TableHead>
                <TableHead>税务</TableHead>
                <TableHead className="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-16 text-center text-sm text-muted-foreground"
                  >
                    暂无组件
                  </TableCell>
                </TableRow>
              ) : (
                items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      {c.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {c.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.code || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {describeCalcConfig(c.calcConfig, resolveName)}
                      </div>
                      {c.calcConfig.kind === 'external' && (
                        <Badge
                          variant="secondary"
                          className="mt-1 text-[10px] font-normal"
                        >
                          每月需录入
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {c.taxTreatment === 'pretax' ? '税前' : '税后'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => onEdit(c)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground"
                              onClick={() => onDelete(c)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </Tooltip>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ComponentsPage() {
  const { components, structures, employees, componentOps } = usePayroll();
  const { currentSchemeId } = useScheme();
  const { spotlight, clearSpotlight } = useOnboarding();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PayComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayComponent | null>(null);

  // 仅当前方案的组件
  const schemeComponents = components.filter(
    (c) => c.schemeId === currentSchemeId,
  );
  const earnings = schemeComponents.filter((c) => c.nature === 'earning');
  const deductions = schemeComponents.filter((c) => c.nature === 'deduction');

  const nameMap = new Map(schemeComponents.map((c) => [c.id, c.name]));
  const resolveName = (id: string) => nameMap.get(id);

  // 删除组件的影响范围
  const deleteImpact = useMemo(() => {
    if (!deleteTarget) return { structureCount: 0, employeeCount: 0 };
    const refStructures = structures.filter((s) =>
      s.items.some((it) => it.componentId === deleteTarget.id),
    );
    const employeeCount = employees.filter((e) =>
      refStructures.some((s) => s.id === e.structureId),
    ).length;
    return { structureCount: refStructures.length, employeeCount };
  }, [deleteTarget, structures, employees]);

  async function handleSubmit(data: PayComponent) {
    try {
      if (editing) {
        await componentOps.update(editing.id, {
          name: data.name,
          code: data.code,
          description: data.description,
          nature: data.nature,
          taxTreatment: data.taxTreatment,
          calcType: data.calcType,
          calcConfig: data.calcConfig,
          period: data.period,
          scope: data.scope,
          status: data.status,
        });
        toast.success('组件已更新');
      } else {
        if (!currentSchemeId) {
          toast.error('请先选择或创建一个方案');
          return;
        }
        await componentOps.create({
          schemeId: currentSchemeId,
          name: data.name,
          code: data.code,
          description: data.description,
          nature: data.nature,
          taxTreatment: data.taxTreatment,
          calcType: data.calcType,
          calcConfig: data.calcConfig,
          period: data.period,
          scope: data.scope,
          status: data.status,
        });
        toast.success('组件已创建');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          定义薪酬的最小计算单元，全部可编辑
        </p>
        <Button
          className={spotlight === 'new-component' ? 'onboarding-spotlight' : ''}
          onClick={() => {
            clearSpotlight();
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> 新建组件
        </Button>
      </div>

      {schemeComponents.some((c) => c.calcConfig.kind === 'external') && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            本方案含外部输入组件，每月算薪前需先到算薪工作台录入数据，未录入将按缺省值计算。
          </span>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => navigate('/payroll')}
          >
            去录入
          </Button>
        </div>
      )}

      <GroupTable
        title="加项"
        items={earnings}
        resolveName={resolveName}
        onEdit={(c) => {
          setEditing(c);
          setFormOpen(true);
        }}
        onDelete={setDeleteTarget}
      />
      <GroupTable
        title="扣项"
        items={deductions}
        resolveName={resolveName}
        onEdit={(c) => {
          setEditing(c);
          setFormOpen(true);
        }}
        onDelete={setDeleteTarget}
      />

      <ComponentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除组件</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除「{deleteTarget?.name}」？删除后进入回收站，30
              天内可还原。有 {deleteImpact.structureCount} 个结构、
              {deleteImpact.employeeCount} 名员工的算薪引用该组件，删除后需同步调整。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await componentOps.softDelete(deleteTarget.id);
                  toast.success('已移入回收站');
                }
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
