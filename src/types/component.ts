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
      coefficient: number;
      fallback: number;
    };

export interface PayComponent extends AuditFields {
  code: string;
  name: string;
  nature: Nature;
  taxTreatment: TaxTreatment;
  calcType: CalcType;
  calcConfig: CalcConfig;
  period: 'monthly' | 'annual' | 'oneTime';
  scope: 'all' | 'conditional';
  status: EntityStatus;
}
