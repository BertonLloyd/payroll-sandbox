// 组件库：按加项/扣项分组展示，支持新建、编辑、软删
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import type { CalcType, PayComponent } from '@/types';
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

const CALC_LABELS: Record<CalcType, string> = {
  fixed: '固定金额',
  ratio: '按比例',
  blocks: '积木公式',
  tiered: '阶梯分段',
  external: '外部输入',
};

function GroupTable({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: PayComponent[];
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>编码</TableHead>
              <TableHead>计算方式</TableHead>
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
                  <TableCell>{CALC_LABELS[c.calcType]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {c.taxTreatment === 'pretax' ? '税前' : '税后'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground"
                        onClick={() => onDelete(c)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ComponentsPage() {
  const { components, componentOps } = usePayroll();
  const { currentSchemeId } = useScheme();
  const { spotlight, clearSpotlight } = useOnboarding();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PayComponent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayComponent | null>(null);

  // 仅当前方案的组件
  const schemeComponents = components.filter(
    (c) => c.schemeId === currentSchemeId,
  );
  const earnings = schemeComponents.filter((c) => c.nature === 'earning');
  const deductions = schemeComponents.filter((c) => c.nature === 'deduction');

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

      <GroupTable
        title="加项"
        items={earnings}
        onEdit={(c) => {
          setEditing(c);
          setFormOpen(true);
        }}
        onDelete={setDeleteTarget}
      />
      <GroupTable
        title="扣项"
        items={deductions}
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
              天内可还原。引用该组件的结构需同步调整。
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
