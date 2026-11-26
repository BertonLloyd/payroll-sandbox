// 组件新建/编辑弹窗：按计算类型渲染对应配置，旧类型用真实 baseComponentId/ast/upTo 结构，新类型复用 fields.tsx
import { useEffect, useMemo, useState } from 'react';
import type {
  CalcConfig,
  PayComponent,
  TierBracket,
} from '../../../types';
import { usePayroll } from '../../../store';
import { collectAllInputFields } from '../../../lib/inputFields';
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
import { Checkbox } from '../../ui/checkbox';
import { BlockEditor } from '../blockeditor/BlockEditor';
import {
  AttendanceFields,
  FullAttendanceFields,
  PerformanceFields,
  SeniorityFields,
  type FieldOptions,
} from './fields';

// 新建时各类型默认配置
function defaultCalcConfig(kind: CalcConfig['kind']): CalcConfig {
  switch (kind) {
    case 'fixed':
      return { kind: 'fixed', amount: 0 };
    case 'ratio':
      return {
        kind: 'ratio',
        baseComponentId: '',
        ratio: 0,
        roundRule: { decimals: 2, mode: 'halfUp' },
      };
    case 'blocks':
      return {
        kind: 'blocks',
        ast: { type: 'ref', refType: 'constant', value: 0 },
      };
    case 'tiered':
      return {
        kind: 'tiered',
        baseComponentId: '',
        brackets: [{ upTo: 50000, rate: 0.02, deduct: 0 }],
      };
    case 'external':
      return {
        kind: 'external',
        inputKey: '',
        label: '',
        fallback: 0,
        coefficient: 1,
      };
    case 'performance':
      return {
        kind: 'performance',
        baseMode: 'fixed',
        baseAmount: 0,
        baseComponentIds: [],
        inputLabel: '绩效系数',
        defaultCoefficient: 1,
      };
    case 'attendance':
      return {
        kind: 'attendance',
        baseMode: 'fixed',
        baseAmount: 0,
        baseComponentIds: [],
        dayDivisor: 'actual',
        statutoryDays: 21.75,
        workHoursPerDay: 8,
        sickBaseMode: 'base',
        sickBaseComponentIds: [],
        sickMinimumAmount: 0,
        sickDeductRate: 0.2,
      };
    case 'fullAttendance':
      return {
        kind: 'fullAttendance',
        amount: 0,
        requireNoAbsent: true,
        requireNoSick: false,
        requireNoHourLeave: false,
        attendanceComponentId: '',
      };
    case 'seniority':
      return {
        kind: 'seniority',
        brackets: [{ minYears: 1, amount: 100 }],
      };
  }
}

// 各类型一句话说明
const CALC_TYPE_HINTS: Record<CalcConfig['kind'], string> = {
  fixed: '直接给一个固定金额，如基本工资、固定岗位津贴。',
  ratio: '按基数组件的值乘比例，如按基本工资的一定比例计提。',
  blocks: '用积木公式编排，可引用其他组件与外部输入，支持加减乘除、条件判断。',
  tiered: '按基数组件的值落在的分段区间，套用对应比例，如阶梯提成。',
  external: '每月在工作台录入原始值，如销售额、客户数，再乘系数。',
  performance: '设好基数，工作台只录绩效系数（如 1.2、1.5），按基数 × 系数计算。',
  attendance: '按应出勤、实际出勤、小时假、病假折算缺勤扣款，工作台录入考勤数据。',
  fullAttendance: '与考勤联动，满足全勤条件才发，否则为 0。',
  seniority: '按员工入职日期自动算工龄，命中对应档位发放。',
};

// 固定金额
function FixedFields({
  cfg,
  update,
}: {
  cfg: Extract<CalcConfig, { kind: 'fixed' }>;
  update: (p: Partial<Extract<CalcConfig, { kind: 'fixed' }>>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>固定金额</Label>
      <Input
        type="number"
        value={cfg.amount || ''}
        onChange={(e) => update({ amount: Number(e.target.value) })}
      />
    </div>
  );
}

// 按比例
function RatioFields({
  cfg,
  update,
  options,
}: {
  cfg: Extract<CalcConfig, { kind: 'ratio' }>;
  update: (p: Partial<Extract<CalcConfig, { kind: 'ratio' }>>) => void;
  options: FieldOptions;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>基数组件</Label>
          <Select
            value={cfg.baseComponentId}
            onValueChange={(v) => update({ baseComponentId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择组件" />
            </SelectTrigger>
            <SelectContent>
              {options.components.map((c) => (
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
            value={cfg.ratio}
            onChange={(e) => update({ ratio: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>取整小数位</Label>
          <Select
            value={String(cfg.roundRule.decimals)}
            onValueChange={(v) =>
              update({
                roundRule: { ...cfg.roundRule, decimals: Number(v) },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0 位（到元）</SelectItem>
              <SelectItem value="2">2 位（到分）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>取整方式</Label>
          <Select
            value={cfg.roundRule.mode}
            onValueChange={(v) =>
              update({
                roundRule: {
                  ...cfg.roundRule,
                  mode: v as 'halfUp' | 'down',
                },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="halfUp">四舍五入</SelectItem>
              <SelectItem value="down">向下取整（截断）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// 阶梯分段
function TieredFields({
  cfg,
  update,
  options,
}: {
  cfg: Extract<CalcConfig, { kind: 'tiered' }>;
  update: (p: Partial<Extract<CalcConfig, { kind: 'tiered' }>>) => void;
  options: FieldOptions;
}) {
  function updateBracket(idx: number, patch: Partial<TierBracket>) {
    update({
      brackets: cfg.brackets.map((b, i) =>
        i === idx ? { ...b, ...patch } : b,
      ),
    });
  }
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>基数组件</Label>
        <Select
          value={cfg.baseComponentId}
          onValueChange={(v) => update({ baseComponentId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择组件" />
          </SelectTrigger>
          <SelectContent>
            {options.components.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {cfg.brackets.map((b, i) => (
          <div key={i} className="space-y-1.5 rounded-md border border-border p-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">上限</span>
              <Input
                type="number"
                className="w-28"
                disabled={!Number.isFinite(b.upTo)}
                value={Number.isFinite(b.upTo) ? b.upTo : ''}
                onChange={(e) =>
                  updateBracket(i, { upTo: Number(e.target.value) })
                }
              />
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={!Number.isFinite(b.upTo)}
                  onCheckedChange={(v) =>
                    updateBracket(i, { upTo: v ? Infinity : 0 })
                  }
                />
                封顶档（无上限）
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">比例</span>
              <Input
                type="number"
                step="0.01"
                className="w-24"
                value={b.rate}
                onChange={(e) =>
                  updateBracket(i, { rate: Number(e.target.value) })
                }
              />
              <span className="text-sm text-muted-foreground">速算扣除</span>
              <Input
                type="number"
                className="w-24"
                value={b.deduct ?? 0}
                onChange={(e) =>
                  updateBracket(i, { deduct: Number(e.target.value) })
                }
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            update({
              brackets: [...cfg.brackets, { upTo: 0, rate: 0, deduct: 0 }],
            })
          }
        >
          新增分段
        </Button>
      </div>
    </div>
  );
}

// 外部输入
function ExternalFields({
  cfg,
  update,
}: {
  cfg: Extract<CalcConfig, { kind: 'external' }>;
  update: (p: Partial<Extract<CalcConfig, { kind: 'external' }>>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>录入字段标识（英文）</Label>
          <Input
            value={cfg.inputKey}
            onChange={(e) => update({ inputKey: e.target.value })}
            placeholder="如 sales_amount"
          />
        </div>
        <div className="space-y-1.5">
          <Label>录入字段名称</Label>
          <Input
            value={cfg.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="如 销售额"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>缺省值（未录入时）</Label>
          <Input
            type="number"
            value={cfg.fallback}
            onChange={(e) => update({ fallback: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>系数（录入值 × 系数）</Label>
          <Input
            type="number"
            step="0.01"
            value={cfg.coefficient}
            onChange={(e) => update({ coefficient: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

export function ComponentFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PayComponent | null;
  onSubmit(component: PayComponent): Promise<void>;
}) {
  const { components } = usePayroll();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CalcConfig['kind']>('fixed');
  const [calcConfig, setCalcConfig] = useState<CalcConfig>(
    defaultCalcConfig('fixed'),
  );
  const [excludeFromTotal, setExcludeFromTotal] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setKind(editing.calcConfig.kind);
        setCalcConfig(structuredClone(editing.calcConfig));
        setExcludeFromTotal(editing.excludeFromTotal ?? false);
      } else {
        setName('');
        setKind('fixed');
        setCalcConfig(defaultCalcConfig('fixed'));
        setExcludeFromTotal(false);
      }
    }
  }, [open, editing]);

  // 切换计算类型时重置为该类型默认配置
  function handleKindChange(next: CalcConfig['kind']) {
    setKind(next);
    setCalcConfig(defaultCalcConfig(next));
  }

  // 类型安全的局部更新
  function updateConfig(p: Partial<CalcConfig>) {
    setCalcConfig((prev) => ({ ...prev, ...p }) as CalcConfig);
  }

  // 引用组件与录入字段选项（排除自身）
  const baseOptions: FieldOptions = useMemo(() => {
    const otherComponents = components.filter((c) => c.id !== editing?.id);
    return {
      components: otherComponents.map((c) => ({ id: c.id, name: c.name })),
      inputOptions: collectAllInputFields(otherComponents).map((f) => ({
        key: f.key,
        label: f.label,
      })),
    };
  }, [components, editing]);

  // 可关联的考勤组件（全勤奖用）
  const attendanceComponents = useMemo(
    () =>
      components
        .filter(
          (c) =>
            c.id !== editing?.id && c.calcConfig.kind === 'attendance',
        )
        .map((c) => ({ id: c.id, name: c.name })),
    [components, editing],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑组件' : '新建组件'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>组件名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如 基本工资、销售提成"
              />
            </div>
            <div className="space-y-1.5">
              <Label>计算方式</Label>
              <Select
                value={kind}
                onValueChange={(v) =>
                  handleKindChange(v as CalcConfig['kind'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">固定金额</SelectItem>
                  <SelectItem value="ratio">按比例</SelectItem>
                  <SelectItem value="blocks">积木公式</SelectItem>
                  <SelectItem value="tiered">阶梯分段</SelectItem>
                  <SelectItem value="external">外部输入</SelectItem>
                  <SelectItem value="performance">绩效系数</SelectItem>
                  <SelectItem value="attendance">考勤扣款</SelectItem>
                  <SelectItem value="fullAttendance">全勤奖</SelectItem>
                  <SelectItem value="seniority">工龄奖</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={excludeFromTotal}
              onCheckedChange={(v) => setExcludeFromTotal(Boolean(v))}
            />
            <span>
              仅作计算基数，不计入应发/扣款合计
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                适用于销售额、考勤基数等需要录入并被其他组件引用、但本身不直接发放的项；仍会在工资明细中标注展示。
              </span>
            </span>
          </label>

          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {CALC_TYPE_HINTS[kind]}
          </p>

          {calcConfig.kind === 'fixed' && (
            <FixedFields cfg={calcConfig} update={updateConfig} />
          )}
          {calcConfig.kind === 'ratio' && (
            <RatioFields
              cfg={calcConfig}
              update={updateConfig}
              options={baseOptions}
            />
          )}
          {calcConfig.kind === 'blocks' && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBlockOpen(true)}
              >
                打开积木公式编辑器
              </Button>
              <p className="text-xs text-muted-foreground">
                当前规则：{JSON.stringify(calcConfig.ast)}
              </p>
              <BlockEditor
                open={blockOpen}
                onOpenChange={setBlockOpen}
                value={calcConfig.ast}
                onChange={(node) => updateConfig({ ast: node })}
                components={baseOptions.components}
                inputOptions={baseOptions.inputOptions}
              />
            </div>
          )}
          {calcConfig.kind === 'tiered' && (
            <TieredFields
              cfg={calcConfig}
              update={updateConfig}
              options={baseOptions}
            />
          )}
          {calcConfig.kind === 'external' && (
            <ExternalFields cfg={calcConfig} update={updateConfig} />
          )}
          {calcConfig.kind === 'performance' && (
            <PerformanceFields
              cfg={calcConfig}
              update={updateConfig}
              options={baseOptions}
            />
          )}
          {calcConfig.kind === 'attendance' && (
            <AttendanceFields
              cfg={calcConfig}
              update={updateConfig}
              options={baseOptions}
            />
          )}
          {calcConfig.kind === 'fullAttendance' && (
            <FullAttendanceFields
              cfg={calcConfig}
              update={updateConfig}
              attendanceComponents={attendanceComponents}
            />
          )}
          {calcConfig.kind === 'seniority' && (
            <SeniorityFields cfg={calcConfig} update={updateConfig} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              if (!name.trim()) return;
              await onSubmit({
                ...(editing ?? {}),
                name: name.trim(),
                calcConfig,
                excludeFromTotal,
              } as PayComponent);
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
