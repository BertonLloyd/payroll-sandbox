// 薪酬模板：内置三套岗位模板 + 空白起步
import type { AuditFields } from './common';
import type { PayComponent } from './component';
import type { PayStructure } from './structure';
import type { Employee } from './employee';

export type TemplateCategory =
  | 'general-service'
  | 'chain-store'
  | 'sales'
  | 'blank';

export interface PayTemplate extends AuditFields {
  name: string;
  category: TemplateCategory;
  builtIn: boolean;
  payload: {
    components: PayComponent[];
    structures: PayStructure[];
    sampleEmployees: Employee[];
  };
}
