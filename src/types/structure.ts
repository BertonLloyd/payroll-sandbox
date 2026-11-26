// 薪酬结构：引用组件，可改默认值、可增删、可分组排序
import type { AuditFields, EntityStatus } from './common';
import type { CalcConfig } from './component';

export interface StructureGroup {
  id: string;
  name: string;
  order: number;
}

export interface StructureItem {
  id: string;
  componentId: string;
  groupId: string;
  order: number;
  override?: Partial<CalcConfig>; // 结构级覆盖组件默认值
}

export interface PayStructure extends AuditFields {
  schemeId: string; // 归属方案
  name: string;
  description: string;
  status: EntityStatus;
  groups: StructureGroup[];
  items: StructureItem[];
}
