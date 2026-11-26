// 薪酬结构：左侧多结构管理，右侧编排（增删/排序/覆盖），顶部实时预览工资条
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import { collectAllInputFields } from '@/lib/inputFields';
import type {
  CalcConfig,
  Employee,
  PayStructure,
  StructureItem,
} from '@/types';
import { uid } from '@/lib/id';
import { cloneStructure } from '@/lib/cloneStructure';
import { formatMoney } from '@/lib/format';
import { calcPayroll } from '@/engine/calcPayroll';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { StructureOverrideDialog } from '@/components/business/structureform/StructureOverrideDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOnboarding } from '@/components/business/onboarding';
import { toast } from 'sonner';

export default function StructuresPage() {
  const {
    structures: allStructures,
    components: allComponents,
    employees: allEmployees,
    paramPacks,
    structureOps,
  } = usePayroll();
  const { currentSchemeId } = useScheme();
  const { spotlight, clearSpotlight } = useOnboarding();

  // 仅当前方案的结构与组件
  const structures = allStructures.filter(
    (s) => s.schemeId === currentSchemeId,
  );
  const components = allComponents.filter(
    (c) => c.schemeId === currentSchemeId,
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    structures[0]?.id ?? null,
  );
  const [overrideItem, setOverrideItem] = useState<StructureItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addKey, setAddKey] = useState<string>('');

  const selected = structures.find((s) => s.id === selectedId) ?? null;
  const componentMap = new Map(components.map((c) => [c.id, c]));
  const overrideRefOptions = useMemo(
    () => components.map((c) => ({ id: c.id, name: c.name })),
    [components],
  );
  const overrideInputOptions = useMemo(
    () =>
      collectAllInputFields(components).map((f) => ({
        key: f.key,
        label: f.label,
      })),
    [components],
  );

  // 数据加载或删除后，当前选中失效时自动落到第一个结构
  useEffect(() => {
    if (!structures.some((s) => s.id === selectedId)) {
      setSelectedId(structures[0]?.id ?? null);
    }
  }, [structures, selectedId]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 实时预览：构造临时员工，用默认参数包与空外部输入算薪
  const preview = useMemo(() => {
    if (!selected || selected.items.length === 0) return null;
    const pack = paramPacks.find((p) => p.isDefault) ?? paramPacks[0];
    if (!pack) return null;
    const tempEmployee: Employee = {
      id: '__preview__',
      schemeId: currentSchemeId ?? '',
      empNo: '',
      name: '预览',
      department: '',
      position: '',
      level: '',
      structureId: selected.id,
      hireDate: '',
      status: 'active',
      overrides: [],
      createdAt: 0,
      updatedAt: 0,
      deleted: false,
      deletedAt: null,
    };
    try {
      return calcPayroll({
        schemeId: currentSchemeId ?? '',
        employee: tempEmployee,
        structure: selected,
        components,
        paramPack: pack,
        inputValues: {},
        year,
        month,
      });
    } catch {
      return null;
    }
  }, [selected, components, paramPacks, year, month]);

  async function persist(patch: Partial<PayStructure>) {
    if (!selected) return;
    await structureOps.update(selected.id, patch);
  }

  async function createStructure() {
    if (!currentSchemeId) {
      toast.error('请先选择或创建一个方案');
      return;
    }
    const groupId = uid();
    const created = await structureOps.create({
      schemeId: currentSchemeId,
      name: '新薪酬结构',
      description: '',
      status: 'active',
      groups: [{ id: groupId, name: '薪酬项', order: 0 }],
      items: [],
    });
    setSelectedId(created.id);
  }

  async function duplicate() {
    if (!selected) return;
    const created = await structureOps.create(cloneStructure(selected));
    setSelectedId(created.id);
    toast.success('结构已复制');
  }

  async function reorder(index: number, direction: -1 | 1) {
    if (!selected) return;
    const next = [...selected.items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = next[target], next[index];
    next.forEach((it, i) => (it.order = i));
    await persist({ items: next });
  }

  async function removeItem(index: number) {
    if (!selected) return;
    const next = selected.items.filter((_, i) => i !== index);
    next.forEach((it, i) => (it.order = i));
    await persist({ items: next });
  }

  async function addComponent(componentId: string) {
    if (!selected || !componentId) return;
    const groupId = selected.groups[0]?.id ?? '';
    const item: StructureItem = {
      id: uid(),
      componentId,
      groupId,
      order: selected.items.length,
    };
    await persist({ items: [...selected.items, item] });
    setAddKey('');
  }

  const usedIds = new Set(selected?.items.map((i) => i.componentId));
  const availableComponents = components.filter((c) => !usedIds.has(c.id));

  return (
    <div className="grid h-full grid-cols-[260px_1fr] gap-4">
      {/* 左侧结构列表 */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">薪酬结构</CardTitle>
            <Button
              size="icon"
              variant="outline"
              className={spotlight === 'new-structure' ? 'onboarding-spotlight' : ''}
              onClick={() => {
                clearSpotlight();
                createStructure();
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-1.5 overflow-y-auto">
          {structures.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              暂无结构，点击 + 新建
            </p>
          )}
          {structures.map((s) => (
            <div
              key={s.id}
              className={`flex cursor-pointer items-center justify-between rounded-md border px-2.5 py-2 text-sm transition-colors ${
                s.id === selectedId
                  ? 'border-primary bg-sidebar-accent'
                  : 'border-transparent hover:bg-sidebar-accent/60'
              }`}
              onClick={() => setSelectedId(s.id)}
            >
              <span className="truncate font-medium">{s.name}</span>
              {s.status === 'inactive' && (
                <Badge variant="outline" className="ml-1 shrink-0">
                  停用
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 右侧编排 */}
      {!selected ? (
        <Card>
          <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
            请选择或新建一个结构
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Input
                  className="max-w-xs font-semibold"
                  value={selected.name}
                  onChange={(e) =>
                    structureOps.update(selected.id, { name: e.target.value })
                  }
                />
                <Button variant="outline" size="sm" onClick={duplicate}>
                  <Copy className="size-4" /> 复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    persist({
                      status:
                        selected.status === 'active' ? 'inactive' : 'active',
                    })}
                >
                  <Power className="size-4" />
                  {selected.status === 'active' ? '停用' : '启用'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setDeleteId(selected.id)}
                >
                  <Trash2 className="size-4" /> 删除
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {selected.items.map((item, index) => {
                const comp = componentMap.get(item.componentId);
                if (!comp) return null;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <span className="flex-1 text-sm font-medium">
                      {comp.name}
                    </span>
                    {item.override && (
                      <Badge variant="outline">已覆盖</Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setOverrideItem(item)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>结构内覆盖</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={index === 0}
                          onClick={() => reorder(index, -1)}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>上移</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={index === selected.items.length - 1}
                          onClick={() => reorder(index, 1)}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>下移</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>从结构移除</TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}

              <Select value={addKey} onValueChange={addComponent}>
                <SelectTrigger>
                  <SelectValue placeholder="添加组件到结构" />
                </SelectTrigger>
                <SelectContent>
                  {availableComponents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 实时预览 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">实时工资条预览</CardTitle>
            </CardHeader>
            <CardContent>
              {!preview ? (
                <p className="text-sm text-muted-foreground">
                  含外部输入的组件需在算薪工作台补全数据后预览
                </p>
              ) : (
                <div className="space-y-1.5">
                  {preview.lines.map((line) => (
                    <div
                      key={line.componentId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{line.name}</span>
                      <span className="font-medium">
                        {formatMoney(line.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t pt-2 text-sm font-semibold">
                    <span>实发</span>
                    <span className="text-primary">
                      {formatMoney(preview.net)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {overrideItem && (
        <StructureOverrideDialog
          open={!!overrideItem}
          onOpenChange={(o) => !o && setOverrideItem(null)}
          component={componentMap.get(overrideItem.componentId)!}
          item={overrideItem}
          refOptions={overrideRefOptions}
          inputOptions={overrideInputOptions}
          onSave={async (override: Partial<CalcConfig> | undefined) => {
            if (!selected) return;
            const next = selected.items.map((it) =>
              it.id === overrideItem.id ? { ...it, override } : it,
            );
            await persist({ items: next });
            setOverrideItem(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除该薪酬结构？</AlertDialogTitle>
            <AlertDialogDescription>
              当前有{' '}
              {allEmployees.filter((e) => e.structureId === deleteId).length}{' '}
              名员工使用该结构，删除后需重新挂接。结构将移入回收站，30 天内可还原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteId) {
                  await structureOps.softDelete(deleteId);
                  setSelectedId(structures[0]?.id ?? null);
                  setDeleteId(null);
                  toast.success('结构已移入回收站');
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
