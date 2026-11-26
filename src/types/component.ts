// 薪酬组件：最小计算单元，全部可编辑
import type { AuditFields, EntityStatus, Nature, TaxTreatment, RoundRule } from './common';
import type { BlockNode } from './ast';

export type CalcType = 'fixed' | 'ratio' | 'blocks' | 'tiered' | 'external';

export interface TierBracket {
  upTo: number;
  rate: number;
  deduct?: number;
}

export type CalcConfig =
  | { kind: 'fixed'; amount: number }
  | { kind: 'ratio'; baseComponentId: string; ratio: number; roundRule: RoundRule }
  | { kind: 'blocks'; ast: BlockNode }
  | { kind: 'tiered'; baseComponentId: string; brackets: TierBracket[] }
  | {
      kind: 'external';
      inputKey: string;
      label?: string; // 中文显示名，界面优先展示；缺省时回退 inputKey
      coefficient: number;
      fallback: number;
    };

export interface PayComponent extends AuditFields {
  schemeId: string; // 归属方案
  code: string;
  name: string;
  description?: string; // 计算说明：用中文写清该组件怎么算，便于新人理解
  nature: Nature;
  taxTreatment: TaxTreatment;
  calcType: CalcType;
  calcConfig: CalcConfig;
  period: 'monthly' | 'annual' | 'oneTime';
  scope: 'all' | 'conditional';
  status: EntityStatus;
}
