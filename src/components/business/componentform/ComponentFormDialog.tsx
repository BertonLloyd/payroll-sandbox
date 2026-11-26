// 组件新建/编辑表单：基本字段 + 五种计算配置；各配置抽成类型明确的子组件
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  CalcConfig,
  CalcType,
  PayComponent,
} from '../../../types';
import { usePayroll } from '../../../store';
import { parseNumber } from '../../../lib/format';
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
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { BlockEditor } from '../blockeditor/BlockEditor';

function blankDraft(): PayComponent {
  return {
    id: '',
    schemeId: '',
    code: '',
    name: '',
    description: '',
    nature: 'earning',
    taxTreatment: 'pretax',
    calcType: 'fixed',
    calcConfig: { kind: 'fixed', amount: 0 },
    period: 'monthly',
    scope: 'all',
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    deleted: false,
    deletedAt: null,
  };
}

function defaultCalcConfig(kind: CalcType): CalcConfig {
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
      return { kind: 'tiered', baseComponentId: '', brackets: [] };
    case 'external':
      return {
        kind: 'external',
        inputKey: '',
        label: '',
        coefficient: 1,
        fallback: 0,
      };
  }
}

// 五种计算方式的通俗说明，随当前选择展示
const CALC_TYPE_HINTS: Record<CalcType, string> = {
  fixed: '固定金额：每月发同样的钱，直接填写金额即可。',
  ratio: '按比例：以另一个组件为基数，按百分比计算，例如基本工资的 5%。',
  blocks: '积木公式：像搭积木一样拼出规则，支持加减乘除和条件判断，无需写代码。',
  tiered: '阶梯分段：基数落在哪个区间，就按该区间的比例计算，常用于提成。',
  external: '外部输入驱动：每月先录入数据（如销售额、绩效），再据此计算。',
};

function BaseComponentSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: PayComponent[];
  onChange(id: string): void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="选择基数组件" />
      </SelectTrigger>
      <SelectContent>
        {options.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RatioFields({
  config,
  baseOptions,
  onChange,
}: {
  config: Extract<CalcConfig, { kind: 'ratio' }>;
  baseOptions: PayComponent[];
  onChange(config: CalcConfig): void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>计算基数（组件）</Label>
        <BaseComponentSelect
          value={config.baseComponentId}
          options={baseOptions}
          onChange={(id) => onChange({ ...config, baseComponentId: id })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>比例（%）</Label>
        <Input
          type="number"
          value={config.ratio * 100}
          onChange={(e) =>
            onChange({ ...config, ratio: parseNumber(e.target.value) / 100 })
          }
        />
      </div>
    </div>
  );
}

function TieredFields({
  config,
  baseOptions,
  onChange,
}: {
  config: Extract<CalcConfig, { kind: 'tiered' }>;
  baseOptions: PayComponent[];
  onChange(config: CalcConfig): void;
}) {
  const updateBracket = (i: number, patch: Partial<typeof config.brackets[number]>) =>
    onChange({
      ...config,
      brackets: config.brackets.map((b, j) => (j === i ? { ...b, ...patch } : b)),
    });

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label>计算基数（组件）</Label>
        <BaseComponentSelect
          value={config.baseComponentId}
          options={baseOptions}
          onChange={(id) => onChange({ ...config, baseComponentId: id })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>分段（上限 / 比例% / 速算扣除）</Label>
        {config.brackets.map((b, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              type="number"
              placeholder="上限"
              value={b.upTo}
              onChange={(e) =>
                updateBracket(i, { upTo: parseNumber(e.target.value) })
              }
            />
            <Input
              type="number"
              placeholder="比例%"
              value={b.rate * 100}
              onChange={(e) =>
                updateBracket(i, { rate: parseNumber(e.target.value) / 100 })
              }
            />
            <Input
              type="number"
              placeholder="速算"
              value={b.deduct ?? 0}
              onChange={(e) =>
                updateBracket(i, { deduct: parseNumber(e.target.value) })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onChange({
                  ...config,
                  brackets: config.brackets.filter((_, j) => j !== i),
                })
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
          className="w-full"
          onClick={() =>
            onChange({
              ...config,
              brackets: [...config.brackets, { upTo: 0, rate: 0, deduct: 0 }],
            })
          }
        >
          <Plus className="size-3.5" /> 添加分段
        </Button>
      </div>
    </div>
  );
}

function ExternalFields({
  config,
  onChange,
}: {
  config: Extract<CalcConfig, { kind: 'external' }>;
  onChange(config: CalcConfig): void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>输入字段标识</Label>
        <Input
          value={config.inputKey}
          onChange={(e) => onChange({ ...config, inputKey: e.target.value })}
          placeholder="如 sales、performance"
        />
      </div>
      <div className="space-y-1.5">
        <Label>中文显示名</Label>
        <Input
          value={config.label ?? ''}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
          placeholder="如 销售额、绩效系数"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>系数</Label>
          <Input
            type="number"
            value={config.coefficient}
            onChange={(e) =>
              onChange({ ...config, coefficient: parseNumber(e.target.value) })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>缺省值</Label>
          <Input
            type="number"
            value={config.fallback}
            onChange={(e) =>
              onChange({ ...config, fallback: parseNumber(e.target.value) })
            }
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
  onSubmit(data: PayComponent): Promise<void>;
}) {
  const { components } = usePayroll();
  const [draft, setDraft] = useState<PayComponent>(blankDraft());
  const [blockOpen, setBlockOpen] = useState(false);

  useEffect(() => {
    if (open) setDraft(editing ? structuredClone(editing) : blankDraft());
  }, [open, editing]);

  const setConfig = (calcConfig: CalcConfig) =>
    setDraft((d) => ({ ...d, calcConfig }));

  const baseOptions = components.filter((c) => c.id !== draft.id);
  const refOptions = baseOptions.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑组件' : '新建组件'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>组件名称</Label>
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="如 基本工资"
                />
              </div>
              <div className="space-y-1.5">
                <Label>编码</Label>
                <Input
                  value={draft.code}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, code: e.target.value }))
                  }
                  placeholder="如 BASE"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>计算说明</Label>
              <Input
                value={draft.description ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="用一句话写清怎么算，如 基本工资 × 2%"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>加项 / 扣项</Label>
                <RadioGroup
                  className="flex gap-4 pt-1"
                  value={draft.nature}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, nature: v as never }))
                  }
                >
                  <span className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="earning" /> 加项
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="deduction" /> 扣项
                  </span>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label>税前 / 税后</Label>
                <RadioGroup
                  className="flex gap-4 pt-1"
                  value={draft.taxTreatment}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, taxTreatment: v as never }))
                  }
                >
                  <span className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="pretax" /> 税前
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <RadioGroupItem value="posttax" /> 税后
                  </span>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>计算方式</Label>
              <Select
                value={draft.calcType}
                onValueChange={(kind) => {
                  const k = kind as CalcType;
                  setDraft((d) => ({
                    ...d,
                    calcType: k,
                    calcConfig: defaultCalcConfig(k),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">固定金额</SelectItem>
                  <SelectItem value="ratio">按比例</SelectItem>
                  <SelectItem value="blocks">积木公式</SelectItem>
                  <SelectItem value="tiered">阶梯分段</SelectItem>
                  <SelectItem value="external">外部输入驱动</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {CALC_TYPE_HINTS[draft.calcType]}
              </p>
            </div>

            {draft.calcConfig.kind === 'fixed' && (
              <div className="space-y-1.5">
                <Label>固定金额</Label>
                <Input
                  type="number"
                  value={draft.calcConfig.amount}
                  onChange={(e) =>
                    setConfig({
                      kind: 'fixed',
                      amount: parseNumber(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {draft.calcConfig.kind === 'ratio' && (
              <RatioFields
                config={draft.calcConfig}
                baseOptions={baseOptions}
                onChange={setConfig}
              />
            )}

            {draft.calcConfig.kind === 'blocks' && (
              <div className="space-y-2">
                <Label>积木公式</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setBlockOpen(true)}
                >
                  打开积木编辑器
                </Button>
              </div>
            )}

            {draft.calcConfig.kind === 'tiered' && (
              <TieredFields
                config={draft.calcConfig}
                baseOptions={baseOptions}
                onChange={setConfig}
              />
            )}

            {draft.calcConfig.kind === 'external' && (
              <ExternalFields config={draft.calcConfig} onChange={setConfig} />
            )}
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

      {draft.calcConfig.kind === 'blocks' && (
        <BlockEditor
          open={blockOpen}
          onOpenChange={setBlockOpen}
          value={draft.calcConfig.ast}
          components={refOptions}
          onChange={(ast) => setConfig({ kind: 'blocks', ast })}
        />
      )}
    </>
  );
}
