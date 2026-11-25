// 通用类型与标准审计字段

export interface AuditFields {
  id: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  deletedAt: number | null;
}

export interface RoundRule {
  decimals: number;
  mode: 'halfUp' | 'down';
}

export type EntityStatus = 'active' | 'inactive';

export type Nature = 'earning' | 'deduction'; // 加项 / 扣项
export type TaxTreatment = 'pretax' | 'posttax'; // 税前 / 税后
