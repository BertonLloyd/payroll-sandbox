// 月度外部输入：业绩、考勤、绩效系数等，驱动 external 类型组件
import type { AuditFields } from './common';

export interface MonthlyInput extends AuditFields {
  schemeId: string; // 归属方案
  employeeId: string;
  year: number;
  month: number; // 1-12
  values: Record<string, number>;
}
