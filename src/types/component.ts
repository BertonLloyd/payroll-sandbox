// 薪酬组件：最小计算单元，全部可编辑
import type { AuditFields, EntityStatus, Nature, TaxTreatment, RoundRule } from './common';
import type { BlockNode } from './ast';

// 九种计算方式：原五种 + 绩效系数、考勤扣款、全勤奖、工龄奖
export type CalcType =
  | 'fixed'
  | 'ratio'
  | 'blocks'
  | 'tiered'
  | 'external'
  | 'performance'
  | 'attendance'
  | 'fullAttendance'
  | 'seniority';

export interface TierBracket {
  upTo: number;
  rate: number;
  deduct?: number;
}

// 基数来源：固定金额，或引用一个/多个组件求和
export interface BaseSource {
  baseMode: 'fixed' | 'components';
  baseAmount: number;
  baseComponentIds: string[];
}

// 工龄奖档位：满 minYears 周年发 amount
export interface SeniorityBracket {
  minYears: number;
  amount: number;
}

export type CalcConfig =
  | { kind: 'fixed'; amount: number }
  | { kind: 'ratio'; baseComponentId: string; ratio: number; roundRule: RoundRule }
  | { kind: 'blocks'; ast: BlockNode }
  | { kind: 'tiered'; baseComponentId: string; brackets: TierBracket[] }
  | {
      kind: 'external';
      inputKey: string;
      label?: string; // 中文显示名，界面优先展示；缺省时回退 inputKey
      coefficient: number;
      fallback: number;
    }
  | {
      // 绩效系数：绩效基数 × 每月录入系数（1.2/1.5/0.8）
      kind: 'performance';
      baseMode: 'fixed' | 'components';
      baseAmount: number;
      baseComponentIds: string[];
      inputLabel: string; // 录入字段中文显示名，如 绩效系数
      defaultCoefficient: number; // 缺省系数，未录入按此值
    }
  | {
      // 考勤扣款：缺勤 + 小时假 + 病假三类折算，一个组件一次配好
      kind: 'attendance';
      baseMode: 'fixed' | 'components';
      baseAmount: number; // 月工资基数（缺勤、小时假日工资用）
      baseComponentIds: string[];
      dayDivisor: 'actual' | 'statutory'; // 当月应出勤天数 / 法定 21.75
      statutoryDays: number; // 法定月计薪天数，默认 21.75
      workHoursPerDay: number; // 日工时，默认 8，可修改
      sickBaseMode: 'base' | 'gross' | 'minimum'; // 本人基本工资 / 满勤标准应发 / 当地最低工资
      sickBaseComponentIds: string[]; // 本人基本工资引用
      sickMinimumAmount: number; // 当地最低工资（固定金额）
      sickDeductRate: number; // 病假扣款比例（直接填，如 0.2 表示扣 20%）
    }
  | {
      // 全勤奖：读取考勤数据，满足条件发固定奖金，否则 0
      kind: 'fullAttendance';
      amount: number;
      requireNoAbsent: boolean; // 缺勤天数 = 0
      requireNoSick: boolean; // 病假天数 = 0
      requireNoHourLeave: boolean; // 小时假 = 0
      attendanceComponentId: string; // 关联考勤组件，读取其录入字段
    }
  | {
      // 工龄奖：按员工入职日期到算薪当月自动算周年，落档取金额
      kind: 'seniority';
      brackets: SeniorityBracket[];
    };

export interface PayComponent extends AuditFields {
  schemeId: string; // 归属方案
  code: string;
  name: string;
  description?: string; // 计算说明：用中文写清该组件怎么算，便于新人理解
  nature: Nature;
  taxTreatment: TaxTreatment;
  calcType: CalcType;
  calcConfig: CalcConfig;
  excludeFromTotal?: boolean; // 仅作计算基数（如销售额），不计入应发/扣款合计，但仍可被引用、在明细展示
  period: 'monthly' | 'annual' | 'oneTime';
  scope: 'all' | 'conditional';
  status: EntityStatus;
}
