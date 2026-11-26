// 组件字段编辑组件：供 ComponentFormDialog 与覆盖弹窗复用，保证同一套配置口径
import { Plus, Trash2 } from 'lucide-react';
import type {
  BaseSource,
  CalcConfig,
  SeniorityBracket,
} from '../../../types';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';

// 四种新配置由联合类型 Extract 派生（真实类型未单独命名导出）
type PerformanceConfig = Extract<CalcConfig, { kind: 'performance' }>;
type AttendanceConfig = Extract<CalcConfig, { kind: 'attendance' }>;
type FullAttendanceConfig = Extract<CalcConfig, { kind: 'fullAttendance' }>;
type SeniorityConfig = Extract<CalcConfig, { kind: 'seniority' }>;

export interface FieldOptions {
  components: { id: string; name: string }[];
  inputOptions: { key: string; label: string }[];
}

// 多选组件（Checkbox 列表）
export function ComponentMultiPicker({
  options,
  selected,
  onToggle,
}: {
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        暂无其他组件可选，请先创建被引用的组件
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-md border border-border p-2">
      {options.map((opt) => (
        <label key={opt.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(opt.id)}
            onCheckedChange={() => onToggle(opt.id)}
          />
          <span className="truncate">{opt.name}</span>
        </label>
      ))}
    </div>
  );
}

// 基数来源：固定金额或引用其他组件
export function BaseSourceEditor({
  value,
  onChange,
  options,
  fixedLabel = '固定金额',
  refLabel = '引用组件（求和）',
}: {
  value: BaseSource;
  onChange: (patch: Partial<BaseSource>) => void;
  options: { id: string; name: string }[];
  fixedLabel?: string;
  refLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <RadioGroup
        value={value.baseMode}
        onValueChange={(v) => onChange({ baseMode: v as BaseSource['baseMode'] })}
        className="flex gap-4"
      >
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="fixed" id="base-fixed" />
          <Label htmlFor="base-fixed" className="font-normal">
            {fixedLabel}
          </Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="components" id="base-components" />
          <Label htmlFor="base-components" className="font-normal">
            {refLabel}
          </Label>
        </div>
      </RadioGroup>

      {value.baseMode === 'fixed' ? (
        <Input
          type="number"
          value={value.baseAmount || ''}
          onChange={(e) => onChange({ baseAmount: Number(e.target.value) })}
          placeholder="输入金额"
        />
      ) : (
        <ComponentMultiPicker
          options={options}
          selected={value.baseComponentIds}
          onToggle={(id) =>
            onChange({
              baseComponentIds: value.baseComponentIds.includes(id)
                ? value.baseComponentIds.filter((x) => x !== id)
                : [...value.baseComponentIds, id],
            })}
        />
      )}
    </div>
  );
}

// 绩效系数字段
export function PerformanceFields({
  cfg,
  update,
  options,
}: {
  cfg: PerformanceConfig;
  update: (patch: Partial<PerformanceConfig>) => void;
  options: FieldOptions;
}) {
  const baseOptions = options.components.filter((c) => c.id !== '');
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>绩效基数</Label>
        <BaseSourceEditor value={cfg} onChange={update} options={baseOptions} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>录入字段名称</Label>
          <Input
            value={cfg.inputLabel}
            onChange={(e) => update({ inputLabel: e.target.value })}
            placeholder="如：绩效系数"
          />
        </div>
        <div className="space-y-1.5">
          <Label>缺省系数（未录入时）</Label>
          <Input
            type="number"
            step="0.1"
            value={cfg.defaultCoefficient}
            onChange={(e) =>
              update({ defaultCoefficient: Number(e.target.value) })
            }
          />
        </div>
      </div>
      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        算薪工作台会出现「{cfg.inputLabel || '绩效系数'}」录入列，按「基数 × 系数」计算。该系数每月、每位员工都可自由修改，员工之间互不影响；未录入时按缺省系数 {cfg.defaultCoefficient} 计算。
      </p>
    </div>
  );
}

// 考勤扣款字段
export function AttendanceFields({
  cfg,
  update,
  options,
}: {
  cfg: AttendanceConfig;
  update: (patch: Partial<AttendanceConfig>) => void;
  options: FieldOptions;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>月计薪基数（用于折算日工资）</Label>
        <BaseSourceEditor value={cfg} onChange={update} options={options.components} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>日工资分母</Label>
          <Select
            value={cfg.dayDivisor}
            onValueChange={(v) =>
              update({ dayDivisor: v as AttendanceConfig['dayDivisor'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">当月应出勤天数</SelectItem>
              <SelectItem value="statutory">法定计薪天数</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {cfg.dayDivisor === 'statutory' && (
          <div className="space-y-1.5">
            <Label>法定计薪天数</Label>
            <Input
              type="number"
              step="0.01"
              value={cfg.statutoryDays}
              onChange={(e) =>
                update({ statutoryDays: Number(e.target.value) })
              }
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>日工时（小时）</Label>
          <Input
            type="number"
            value={cfg.workHoursPerDay}
            onChange={(e) =>
              update({ workHoursPerDay: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium">病假扣款设置</p>
        <div className="space-y-1.5">
          <Label>病假基数来源</Label>
          <Select
            value={cfg.sickBaseMode}
            onValueChange={(v) =>
              update({ sickBaseMode: v as AttendanceConfig['sickBaseMode'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">本人基本工资</SelectItem>
              <SelectItem value="gross">月应发工资（满勤口径）</SelectItem>
              <SelectItem value="minimum">当地最低工资</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {cfg.sickBaseMode === 'base' && (
          <div className="space-y-1.5">
            <Label>基本工资组件</Label>
            <ComponentMultiPicker
              options={options.components}
              selected={cfg.sickBaseComponentIds}
              onToggle={(id) =>
                update({
                  sickBaseComponentIds: cfg.sickBaseComponentIds.includes(id)
                    ? cfg.sickBaseComponentIds.filter((x) => x !== id)
                    : [...cfg.sickBaseComponentIds, id],
                })}
            />
          </div>
        )}
        {cfg.sickBaseMode === 'minimum' && (
          <div className="space-y-1.5">
            <Label>当地最低工资（元/月）</Label>
            <Input
              type="number"
              value={cfg.sickMinimumAmount || ''}
              onChange={(e) =>
                update({ sickMinimumAmount: Number(e.target.value) })
              }
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>病假扣款比例（每天扣日工资的比例）</Label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={cfg.sickDeductRate}
            onChange={(e) =>
              update({ sickDeductRate: Number(e.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            病假扣款 = 病假日工资 × 该比例 × 病假天数。如扣 20% 填 0.2
          </p>
        </div>
      </div>

      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        工作台录入：应出勤、实际出勤、小时假、病假四项。缺勤扣款 = 日工资 × 缺勤天数；小时假 = 小时工资 × 小时数；病假按上方规则单独折算。
      </p>
    </div>
  );
}

// 全勤奖字段
export function FullAttendanceFields({
  cfg,
  update,
  attendanceComponents,
}: {
  cfg: FullAttendanceConfig;
  update: (patch: Partial<FullAttendanceConfig>) => void;
  attendanceComponents: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>关联考勤组件</Label>
          <Select
            value={cfg.attendanceComponentId}
            onValueChange={(v) => update({ attendanceComponentId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择考勤扣款组件" />
            </SelectTrigger>
            <SelectContent>
              {attendanceComponents.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>全勤奖金额</Label>
          <Input
            type="number"
            value={cfg.amount || ''}
            onChange={(e) => update({ amount: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>发放条件（满足全部勾选条件才发）</Label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={cfg.requireNoAbsent}
              onCheckedChange={(v) =>
                update({ requireNoAbsent: Boolean(v) })
              }
            />
            无缺勤
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={cfg.requireNoSick}
              onCheckedChange={(v) => update({ requireNoSick: Boolean(v) })}
            />
            无病假
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={cfg.requireNoHourLeave}
              onCheckedChange={(v) =>
                update({ requireNoHourLeave: Boolean(v) })
              }
            />
            无小时假
          </label>
        </div>
      </div>
    </div>
  );
}

// 工龄奖字段
export function SeniorityFields({
  cfg,
  update,
}: {
  cfg: SeniorityConfig;
  update: (patch: Partial<SeniorityConfig>) => void;
}) {
  function updateBracket(
    idx: number,
    patch: Partial<SeniorityConfig['brackets'][number]>,
  ) {
    update({
      brackets: cfg.brackets.map((b, i) =>
        i === idx ? { ...b, ...patch } : b,
      ),
    });
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        按员工入职日期自动计算周年，以算薪当月 1 日为基准；命中满足「满 N 年」的最高档发放。
      </p>
      {cfg.brackets.map((b, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">满</span>
          <Input
            type="number"
            className="w-20"
            value={b.minYears}
            onChange={(e) =>
              updateBracket(i, { minYears: Number(e.target.value) })
            }
          />
          <span className="text-sm text-muted-foreground">年，发</span>
          <Input
            type="number"
            className="w-28"
            value={b.amount || ''}
            onChange={(e) => updateBracket(i, { amount: Number(e.target.value) })}
          />
          <span className="text-sm text-muted-foreground">元</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={() =>
              update({ brackets: cfg.brackets.filter((_, j) => j !== i) })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          update({
            brackets: [
              ...cfg.brackets,
              {
                minYears: (cfg.brackets.at(-1)?.minYears ?? 0) + 1,
                amount: 100,
              },
            ],
          })}
      >
        <Plus className="size-4" /> 新增档位
      </Button>
    </div>
  );
}
