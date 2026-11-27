// 薪酬测算沙盘：调整变量、缴费基数策略与模拟结果类型
import type { PaySlip } from './payslip';

// 社保公积金缴费基数策略：企业可决策的是申报基数，法定上下限由参数包维护
export type SocialStrategyKind = 'full' | 'minimum' | 'ratio' | 'fixed';

export interface SocialBaseStrategy {
  kind: SocialStrategyKind;
  ratio?: number; // kind='ratio'：按应发的比例申报，如 0.8
  amount?: number; // kind='fixed'：统一申报基数（元）
}

// 沙盘调整变量
export interface SandboxAdjustments {
  salaryAdjustPct: number; // 整体调薪幅度（相对，小数，0.05 = 5%）
  performanceCoef: number; // 全局绩效系数（绝对值，1.0）
  floatingAdjustPct: number; // 浮动工资整体系数（相对，小数）
  socialStrategy: SocialBaseStrategy; // 缴费基数策略
  budgetCap: number; // 预算上限（元），仅作对照
  revenue: number | null; // 月度营收（元），可选，用于人力成本率
}

// 基线默认值；预算上限在页面初始化时按基线成本回填
export function createDefaultAdjustments(): SandboxAdjustments {
  return {
    salaryAdjustPct: 0,
    performanceCoef: 1,
    floatingAdjustPct: 0,
    socialStrategy: { kind: 'full' },
    budgetCap: 0,
    revenue: null,
  };
}

// 单个员工的模拟结果
export interface SandboxEmployeeResult {
  employeeId: string;
  empNo: string;
  name: string;
  department: string;
  position: string;
  structureName: string;
  slip: PaySlip;
  employerTotal: number; // 企业承担社保公积金
  totalCost: number; // 工资性总用工成本 = 应发 + 企业社保
}

// 分组指标
export interface SandboxGroupMetric {
  key: string;
  gross: number;
  employerTotal: number;
  totalCost: number;
  count: number;
}

// 总览汇总
export interface SandboxSummary {
  headcount: number;
  gross: number;
  employerTotal: number;
  totalCost: number;
  avgCost: number;
  fixed: number; // 基于应发的固定部分
  floating: number; // 基于应发的浮动部分
  fixedPct: number; // 小数
  floatingPct: number; // 小数
  budgetGap: number; // 预算上限 − 总用工成本
  overBudget: boolean;
  costRate: number | null; // 人力成本率（小数），未填营收为 null
}

export interface SandboxResult {
  employees: SandboxEmployeeResult[];
  summary: SandboxSummary;
  byDepartment: SandboxGroupMetric[];
  byStructure: SandboxGroupMetric[];
}
