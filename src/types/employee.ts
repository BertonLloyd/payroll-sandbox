// 员工：挂接结构，个人覆盖不污染上层
import type { AuditFields } from './common';
import type { CalcConfig } from './component';

export interface EmployeeOverride {
  id: string;
  componentId: string;
  effectiveMonth: string; // YYYY-MM
  overrideConfig: Partial<CalcConfig>;
}

export type EmployeeStatus = 'active' | 'inactive' | 'left';

export interface Employee extends AuditFields {
  empNo: string;
  name: string;
  department: string;
  position: string;
  level: string;
  structureId: string;
  hireDate: string;
  status: EmployeeStatus;
  overrides: EmployeeOverride[];
}
