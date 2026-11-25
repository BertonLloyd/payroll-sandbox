// 员工个人覆盖弹窗：维护按月份生效的组件覆盖，不污染结构与组件默认值
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  CalcConfig,
  Employee,
  EmployeeOverride,
  StructureItem,
} from '../../../types';
import { usePayroll } from '../../../store';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { StructureOverrideDialog } from '../structureform/StructureOverrideDialog';

export function EmployeeOverrideDialog({
  employee,
  open,
  onOpenChange,
  onSave,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean): void;
  onSave(overrides: EmployeeOverride[]): Promise<void>;
}) {
  const { components } = usePayroll();
  const [overrides, setOverrides] = useState<EmployeeOverride[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newComponentId, setNewComponentId] = useState('');
  const [newMonth, setNewMonth] = useState('');

  useEffect(() => {
    if (open) {
      setOverrides(structuredClone(employee.overrides));
      setEditingIndex(null);
    }
  }, [open, employee]);

  const componentMap = new Map(components.map((c) => [c.id, c]));

  function addOverride() {
    if (!newComponentId || !newMonth) return;
    setOverrides((prev) => [
      ...prev,
      {
        id: `ov-${Date.now()}`,
        componentId: newComponentId,
        effectiveMonth: newMonth,
        overrideConfig: {},
      },
    ]);
    setNewComponentId('');
    setNewMonth('');
  }

  const editing = editingIndex !== null ? overrides[editingIndex] : null;
  const editingComponent = editing
    ? componentMap.get(editing.componentId)
    : null;

  // 适配为 StructureOverrideDialog 所需的 item 形状
  const fakeItem: StructureItem | null = editing
    ? {
        id: editing.id,
        componentId: editing.componentId,
        groupId: '',
        order: 0,
        override: editing.overrideConfig as Partial<CalcConfig>,
      }
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>个人覆盖 · {employee.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {overrides.map((ov, i) => (
              <div
                key={ov.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="flex-1 font-medium">
                  {componentMap.get(ov.componentId)?.name ?? '已删除组件'}
                </span>
                <span className="text-muted-foreground">
                  {ov.effectiveMonth} 起
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingIndex(i)}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground"
                  onClick={() =>
                    setOverrides((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Select
                value={newComponentId}
                onValueChange={setNewComponentId}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择组件" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="month"
                className="w-40"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
              />
              <Button variant="outline" onClick={addOverride}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                await onSave(overrides);
                onOpenChange(false);
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && editingComponent && fakeItem && (
        <StructureOverrideDialog
          open={editingIndex !== null}
          onOpenChange={(o) => !o && setEditingIndex(null)}
          component={editingComponent}
          item={fakeItem}
          onSave={(override) => {
            setOverrides((prev) =>
              prev.map((ov, j) =>
                j === editingIndex
                  ? { ...ov, overrideConfig: override ?? {} }
                  : ov,
              ),
            );
            setEditingIndex(null);
          }}
        />
      )}
    </>
  );
}
