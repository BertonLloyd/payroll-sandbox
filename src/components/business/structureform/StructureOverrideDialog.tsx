// 结构项覆盖弹窗：在某薪酬结构范围内覆盖组件默认配置，支持全部九种计算方式
import { useEffect, useMemo, useState } from 'react';
import type {
  CalcConfig,
  PayComponent,
  StructureItem,
} from '../../../types';
import { usePayroll } from '../../../store';
import { mergeConfig } from '../../../engine/componentEval';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { BlockEditor } from '../blockeditor/BlockEditor';
import {
  AttendanceFields,
  FullAttendanceFields,
  PerformanceFields,
  SeniorityFields,
  type FieldOptions,
} from '../componentform/fields';

export function StructureOverrideDialog({
  open,
  onOpenChange,
  component,
  item,
  refOptions,
  inputOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: PayComponent;
  item: StructureItem;
  refOptions: { id: string; name: string }[];
  inputOptions: { key: string; label: string }[];
  onSave: (override: Partial<CalcConfig> | null) => Promise<void>;
}) {
  const { components } = usePayroll();
  // 工作配置：合并默认值与已有覆盖，编辑的是完整配置
  const [working, setWorking] = useState<CalcConfig>(
    mergeConfig(component.calcConfig, item.override),
  );
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setWorking(mergeConfig(component.calcConfig, item.override));
      setBlockOpen(false);
    }
  }, [open, component, item]);

  const fieldOptions: FieldOptions = useMemo(
    () => ({ components: refOptions, inputOptions }),
    [refOptions, inputOptions],
  );

  // 可关联的考勤组件（全勤奖用）
  const attendanceComponents = useMemo(
    () =>
      components
        .filter(
          (c) =>
            c.id !== component.id && c.calcConfig.kind === 'attendance',
        )
        .map((c) => ({ id: c.id, name: c.name })),
    [components],
  );

  function patch(p: Partial<CalcConfig>) {
    setWorking((prev) => ({ ...prev, ...p }) as CalcConfig);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>覆盖配置 · {component.name}</DialogTitle>
        </DialogHeader>

        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          此处配置仅在当前薪酬结构范围内生效，不改变组件默认值；员工个人覆盖优先级更高。
        </p>

        <div className="space-y-3">
          {working.kind === 'fixed' && (
            <div className="space-y-1.5">
              <Label>固定金额</Label>
              <Input
                type="number"
                value={working.amount}
                onChange={(e) => patch({ amount: Number(e.target.value) })}
              />
            </div>
          )}

          {working.kind === 'ratio' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>基数组件</Label>
                <Select
                  value={working.baseComponentId}
                  onValueChange={(v) => patch({ baseComponentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择组件" />
                  </SelectTrigger>
                  <SelectContent>
                    {refOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>比例</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={working.ratio}
                  onChange={(e) => patch({ ratio: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {working.kind === 'blocks' && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlockOpen(true)}
              >
                打开积木公式编辑器
              </Button>
              <p className="break-all text-xs text-muted-foreground">
                当前规则：{JSON.stringify(working.ast)}
              </p>
              <BlockEditor
                open={blockOpen}
                onOpenChange={setBlockOpen}
                value={working.ast}
                onChange={(node) => patch({ ast: node })}
                components={refOptions}
                inputOptions={inputOptions}
              />
            </div>
          )}

          {working.kind === 'tiered' && (
            <div className="space-y-2">
              <Label>分段（JSON 编辑，字段为 upTo/rate/deduct）</Label>
              <textarea
                className="h-32 w-full rounded-md border border-border p-2 font-mono text-xs"
                value={JSON.stringify(working.brackets, null, 2)}
                onChange={(e) => {
                  try {
                    patch({ brackets: JSON.parse(e.target.value) });
                  } catch {
                    /* 编辑中忽略解析错误 */
                  }
                }}
              />
            </div>
          )}

          {working.kind === 'external' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>系数</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={working.coefficient}
                  onChange={(e) =>
                    patch({ coefficient: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>缺省值</Label>
                <Input
                  type="number"
                  value={working.fallback}
                  onChange={(e) =>
                    patch({ fallback: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          )}

          {working.kind === 'performance' && (
            <PerformanceFields
              cfg={working}
              update={patch}
              options={fieldOptions}
            />
          )}

          {working.kind === 'attendance' && (
            <AttendanceFields
              cfg={working}
              update={patch}
              options={fieldOptions}
            />
          )}

          {working.kind === 'fullAttendance' && (
            <FullAttendanceFields
              cfg={working}
              update={patch}
              attendanceComponents={attendanceComponents}
            />
          )}

          {working.kind === 'seniority' && (
            <SeniorityFields cfg={working} update={patch} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await onSave(null);
              onOpenChange(false);
            }}
          >
            清除覆盖
          </Button>
          <Button
            onClick={async () => {
              await onSave(working);
              onOpenChange(false);
            }}
          >
            保存覆盖
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
