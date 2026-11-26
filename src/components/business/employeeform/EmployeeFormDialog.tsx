// 员工档案新建/编辑弹窗：基本字段 + 挂接薪酬结构
import { useEffect, useState } from 'react';
import type { Employee, EmployeeStatus } from '../../../types';
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
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

function blank(): Employee {
  return {
    id: '',
    schemeId: '',
    empNo: '',
    name: '',
    department: '',
    position: '',
    level: '',
    structureId: '',
    hireDate: '',
    status: 'active',
    overrides: [],
    createdAt: 0,
    updatedAt: 0,
    deleted: false,
    deletedAt: null,
  };
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange(open: boolean) => void;
  editing: Employee | null;
  onSubmit(data: Employee): Promise<void>;
}) {
  const { structures } = usePayroll();
  const [draft, setDraft] = useState<Employee>(blank());

  useEffect(() => {
    if (open) setDraft(editing ? structuredClone(editing) : blank());
  }, [open, editing]);

  const set = (patch: Partial<Employee>) =>
    setDraft((d) => ({ ...d, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑员工档案' : '新建员工'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>工号</Label>
            <Input
              value={draft.empNo}
              onChange={(e) => set({ empNo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>姓名</Label>
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>部门</Label>
            <Input
              value={draft.department}
              onChange={(e) => set({ department: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>岗位</Label>
            <Input
              value={draft.position}
              onChange={(e) => set({ position: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>职级</Label>
            <Input
              value={draft.level}
              onChange={(e) => set({ level: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>在职状态</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => set({ status: v as EmployeeStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">在职</SelectItem>
                <SelectItem value="inactive">停职</SelectItem>
                <SelectItem value="left">离职</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>入职日期</Label>
            <Input
              type="date"
              value={draft.hireDate}
              onChange={(e) => set({ hireDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>薪酬结构</Label>
            <Select
              value={draft.structureId}
              onValueChange={(id) => set({ structureId: id })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择结构" />
              </SelectTrigger>
              <SelectContent>
                {structures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              if (!draft.name.trim()) return;
              await onSubmit(draft);
              onOpenChange(false);
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
