// 个税社保参数包：内置一套可编辑参数，支持多地区导入导出
import type { AuditFields, EntityStatus } from './common';
import type { TierBracket } from './component';

export interface InsuranceItem {
  name: string;
  employerRate: number;
  employeeRate: number;
  baseMin: number;
  baseMax: number;
}

export interface TaxParamPack extends AuditFields {
  name: string;
  region: string;
  isDefault: boolean;
  status: EntityStatus;
  tax: { threshold: number; brackets: TierBracket[] };
  social: InsuranceItem[];
  fund: InsuranceItem;
}
