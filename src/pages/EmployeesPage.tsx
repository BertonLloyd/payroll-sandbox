// 员工管理：虚拟滚动表格 + 搜索/部门筛选 + 档案/覆盖/删除
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import type { Employee, EmployeeStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  EmployeeFormDialog,
  EmployeeOverrideDialog,
} from '@/components/business/employeeform';
import { toast } from 'sonner';
import { useOnboarding } from '@/components/business/onboarding';

const GRID =
  'grid grid-cols-[90px_100px_minmax(120px,1fr)_minmax(120px,1fr)_80px_140px_80px_130px] items-center gap-2 px-3';

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: '在职',
  inactive: '停职',
  left: '离职',
};

const ROW_H = 46;

export default function EmployeesPage() {
  const {
    employees: allEmployees,
    structures: allStructures,
    components: allComponents,
    employeeOps,
  } = usePayroll();
  const { currentSchemeId } = useScheme();
  const { spotlight, clearSpotlight } = useOnboarding();
  const navigate = useNavigate();

  // 仅当前方案的员工与结构
  const employees = allEmployees.filter(
    (e) => e.schemeId === currentSchemeId,
  );
  const structures = allStructures.filter(
    (s) => s.schemeId === currentSchemeId,
  );

  const [keyword, setKeyword] = useState('');
  const [dept, setDept] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const structureMap = useMemo(
    () => new Map(structures.map((s) => [s.id, s.name])),
    [structures],
  );

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))],
    [employees],
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return employees.filter((e) => {
      const matchDept = dept === 'all' || e.department === dept;
      const matchKw =
        !kw ||
        e.name.toLowerCase().includes(kw) ||
        e.empNo.toLowerCase().includes(kw) ||
        e.position.toLowerCase().includes(kw);
      return matchDept && matchKw;
    });
  }, [employees, keyword, dept]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  async function handleSubmit(data: Employee) {
    try {
      if (editing) {
        await employeeOps.update(editing.id, {
          empNo: data.empNo,
          name: data.name,
          department: data.department,
          position: data.position,
          level: data.level,
          structureId: data.structureId,
          hireDate: data.hireDate,
          status: data.status,
        });
        toast.success('员工档案已更新');
      } else {
        if (!currentSchemeId) {
          toast.error('请先选择或创建一个方案');
          return;
        }
        await employeeOps.create({
          schemeId: currentSchemeId,
          empNo: data.empNo,
          name: data.name,
          department: data.department,
          position: data.position,
          level: data.level,
          structureId: data.structureId,
          hireDate: data.hireDate,
          status: data.status,
          overrides: data.overrides,
        });
        toast.success('员工已创建');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="搜索姓名 / 工号 / 岗位"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部部门</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className={[
            'ml-auto',
            spotlight === 'new-employee' ? 'onboarding-spotlight' : '',
          ].join(' ')}
          onClick={() => {
            clearSpotlight();
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> 新建员工
        </Button>
      </div>

      {allComponents.some(
        (c) =>
          c.schemeId === currentSchemeId &&
          c.calcConfig.kind === 'external',
      ) && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            本方案含外部输入项，每月算薪前需先到算薪工作台录入，未录入将按缺省值计算。
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

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className={`${GRID} h-11 shrink-0 border-b text-xs font-medium text-muted-foreground`}>
          <span>工号</span>
          <span>姓名</span>
          <span>部门</span>
          <span>岗位</span>
          <span>职级</span>
          <span>薪酬结构</span>
          <span>状态</span>
          <span className="text-right">操作</span>
        </div>
        <CardContent className="min-h-0 flex-1 p-0">
          <div ref={scrollRef} className="h-full overflow-auto">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                暂无符合条件的员工
              </p>
            ) : (
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((vi) => {
                  const e = filtered[vi.index];
                  return (
                    <div
                      key={e.id}
                      className={`${GRID} absolute left-0 w-full border-b text-sm`}
                      style={{
                        height: ROW_H,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <span className="text-muted-foreground">{e.empNo}</span>
                      <span className="flex items-center gap-1 font-medium">
                        {e.name}
                        {e.overrides.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1 text-[9px] font-normal"
                          >
                            已覆盖
                          </Badge>
                        )}
                      </span>
                      <span className="truncate">{e.department}</span>
                      <span className="truncate">{e.position}</span>
                      <span>{e.level}</span>
                      <span className="truncate text-muted-foreground">
                        {structureMap.get(e.structureId) ?? '—'}
                      </span>
                      <span>
                        <Badge variant="outline">
                          {STATUS_LABEL[e.status]}
                        </Badge>
                      </span>
                      <span className="flex justify-end gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => {
                                setEditing(e);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑档案</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setOverrideTarget(e)}
                            >
                              <SlidersHorizontal className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>个人覆盖</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground"
                              onClick={() => setDeleteTarget(e)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
        onEditOverride={(emp) => {
          setFormOpen(false);
          setOverrideTarget(emp);
        }}
      />

      {overrideTarget && (
        <EmployeeOverrideDialog
          employee={overrideTarget}
          open={!!overrideTarget}
          onOpenChange={(o) => !o && setOverrideTarget(null)}
          onSave={async (overrides) => {
            await employeeOps.update(overrideTarget.id, { overrides });
            toast.success('个人覆盖已保存');
          }}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除员工档案？</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await employeeOps.softDelete(deleteTarget.id);
                  toast.success('员工已移入回收站');
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
