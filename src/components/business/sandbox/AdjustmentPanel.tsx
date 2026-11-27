// 薪酬测算沙盘左侧变量控制台：调整变量、缴费基数策略、预算与营收，支持恢复基线
import { RotateCcw } from 'lucide-react';
import type {
  SandboxAdjustments,
  SocialBaseStrategy,
  SocialStrategyKind,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm font-semibold tabular-nums text-primary">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(arr) => onChange(arr[0])}
      />
    </div>
  );
}

function signedPercent(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function AdjustmentPanel({
  adjustments,
  onChange,
  onReset,
}: {
  adjustments: SandboxAdjustments;
  onChange: (patch: Partial<SandboxAdjustments>) => void;
  onReset: () => void;
}) {
  const social = adjustments.socialStrategy;
  const setSocial = (patch: Partial<SocialBaseStrategy>) =>
    onChange({ socialStrategy: { ...social, ...patch } });

  return (
    <div className="space-y-5">
      <SliderRow
        label="整体调薪幅度"
        value={adjustments.salaryAdjustPct * 100}
        min={-20}
        max={20}
        step={0.5}
        onChange={(v) => onChange({ salaryAdjustPct: v / 100 })}
        format={signedPercent}
      />

      <SliderRow
        label="绩效系数"
        value={adjustments.performanceCoef}
        min={0.5}
        max={2}
        step={0.05}
        onChange={(v) => onChange({ performanceCoef: v })}
        format={(v) => v.toFixed(2)}
      />

      <SliderRow
        label="浮动工资整体系数"
        value={adjustments.floatingAdjustPct * 100}
        min={-30}
        max={30}
        step={0.5}
        onChange={(v) => onChange({ floatingAdjustPct: v / 100 })}
        format={signedPercent}
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium">社保公积金缴费基数</Label>
        <Select
          value={social.kind}
          onValueChange={(v) => {
            const kind = v as SocialStrategyKind;
            onChange({
              socialStrategy: {
                ...social,
                kind,
                ratio: kind === 'ratio' ? social.ratio ?? 0.8 : social.ratio,
                amount: kind === 'fixed' ? social.amount ?? 0 : social.amount,
              },
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">足额缴纳</SelectItem>
            <SelectItem value="minimum">按法定下限</SelectItem>
            <SelectItem value="ratio">按工资比例</SelectItem>
            <SelectItem value="fixed">统一基数</SelectItem>
          </SelectContent>
        </Select>
        {social.kind === 'ratio' && (
          <SliderRow
            label="申报比例"
            value={Math.round((social.ratio ?? 0.8) * 100)}
            min={60}
            max={100}
            step={1}
            onChange={(v) => setSocial({ ratio: v / 100 })}
            format={(v) => `${v}%`}
          />
        )}
        {social.kind === 'fixed' && (
          <Input
            type="number"
            value={social.amount ?? ''}
            onChange={(e) => setSocial({ amount: Number(e.target.value) })}
            placeholder="统一申报基数（元）"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">预算上限（元/月）</Label>
        <Input
          type="number"
          value={adjustments.budgetCap || ''}
          onChange={(e) => onChange({ budgetCap: Number(e.target.value) })}
          placeholder="月度预算上限"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">月度营收（可选）</Label>
        <Input
          type="number"
          value={adjustments.revenue ?? ''}
          onChange={(e) =>
            onChange({
              revenue: e.target.value === '' ? null : Number(e.target.value),
            })
          }
          placeholder="用于计算人力成本率"
        />
      </div>

      <Button variant="outline" className="w-full" onClick={onReset}>
        <RotateCcw className="size-4" /> 恢复基线
      </Button>
    </div>
  );
}
