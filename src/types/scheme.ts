// 薪酬方案：每次应用模板或从空白创建，生成一个独立方案，组件/结构/员工/工资条均归属其下
import type { AuditFields } from './common';

// 非模板来源（空白自建）的方案标记
export const CUSTOM_TEMPLATE_ID = 'custom';

export interface Scheme extends AuditFields {
  name: string;
  templateId: string; // 来源模板 id；空白自建为 CUSTOM_TEMPLATE_ID
}
