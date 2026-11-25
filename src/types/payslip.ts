// 工资条快照：确认后锁定、不可改，只可作废
import type { AuditFields, Nature } from './common';

export interface PaySlipLine {
  componentId: string;
  name: string;
  nature: Nature;
  amount: number;
}

export type PaySlipStatus = 'draft' | 'confirmed' | 'void';

export interface PaySlip extends AuditFields {
  employeeId: string;
  year: number;
  month: number;
  structureId: string;
  lines: PaySlipLine[];
  gross: number; // 应发合计
  totalDeduction: number; // 扣除合计（含个税）
  tax: number; // 个税
  net: number; // 实发
  status: PaySlipStatus;
  generatedAt: number;
  confirmedAt: number | null;
}
