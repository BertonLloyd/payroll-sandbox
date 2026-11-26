// 连锁门店模板：固定+绩效系数+考勤扣款+全勤奖+工龄奖+销售额阶梯提成，覆盖月度录入与考勤 Excel 全流程
import type { PayTemplate } from '../../types';
import {
  makeComponent,
  makeStructure,
} from '../entityFactory';
import { generateEmployees } from './employeeGenerator';

const components = [
  makeComponent({
    id: 'cs-base',
    code: 'CS_BASE',
    name: '基本工资',
    description: '固定金额，每月 4500 元',
    calcConfig: { kind: 'fixed', amount: 4500 },
  }),
  makeComponent({
    id: 'cs-post',
    code: 'CS_POST',
    name: '岗位津贴',
    description: '固定金额，每月 1200 元',
    calcConfig: { kind: 'fixed', amount: 1200 },
  }),
  makeComponent({
    id: 'cs-sales',
    code: 'CS_SALES',
    name: '销售额',
    description: '每月在工作台录入当月销售额，仅作提成基数、不直接发放',
    excludeFromTotal: true,
    calcConfig: {
      kind: 'external',
      inputKey: 'cs_sales',
      label: '销售额',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'cs-comm',
    code: 'CS_COMM',
    name: '销售提成',
    description: '按销售额落档，适用区间内按对应比例计提，含封顶档',
    calcConfig: {
      kind: 'tiered',
      baseComponentId: 'cs-sales',
      brackets: [
        { upTo: 50000, rate: 0.02, deduct: 0 },
        { upTo: 100000, rate: 0.03, deduct: 0 },
        { upTo: Infinity, rate: 0.05, deduct: 0 },
      ],
    },
  }),
  makeComponent({
    id: 'cs-perf',
    code: 'CS_PERF',
    name: '绩效工资',
    description: '基数为基本工资+岗位津贴，工作台只录绩效系数，按基数×系数计算',
    calcConfig: {
      kind: 'performance',
      baseMode: 'components',
      baseAmount: 0,
      baseComponentIds: ['cs-base', 'cs-post'],
      inputLabel: '绩效系数',
      defaultCoefficient: 1,
    },
  }),
  makeComponent({
    id: 'cs-attend',
    code: 'CS_ATTEND',
    name: '考勤扣款',
    description: '按应出勤、实际出勤、小时假、病假折算；病假每天扣日工资20%',
    nature: 'deduction',
    calcConfig: {
      kind: 'attendance',
      baseMode: 'components',
      baseAmount: 0,
      baseComponentIds: ['cs-base', 'cs-post'],
      dayDivisor: 'actual',
      statutoryDays: 21.75,
      workHoursPerDay: 8,
      sickBaseMode: 'base',
      sickBaseComponentIds: ['cs-base'],
      sickMinimumAmount: 0,
      sickDeductRate: 0.2,
    },
  }),
  makeComponent({
    id: 'cs-full',
    code: 'CS_FULL',
    name: '全勤奖',
    description: '与考勤联动，无缺勤即发 200 元，否则 0',
    calcConfig: {
      kind: 'fullAttendance',
      amount: 200,
      requireNoAbsent: true,
      requireNoSick: false,
      requireNoHourLeave: false,
      attendanceComponentId: 'cs-attend',
    },
  }),
  makeComponent({
    id: 'cs-senior',
    code: 'CS_SENIOR',
    name: '工龄奖',
    description: '按入职日期自动算周年，满1年100、满3年200、满5年300',
    calcConfig: {
      kind: 'seniority',
      brackets: [
        { minYears: 1, amount: 100 },
        { minYears: 3, amount: 200 },
        { minYears: 5, amount: 300 },
      ],
    },
  }),
  makeComponent({
    id: 'cs-ded',
    code: 'CS_DED',
    name: '门店扣款',
    description: '固定金额，缺省为 0 元',
    nature: 'deduction',
    calcConfig: { kind: 'fixed', amount: 0 },
  }),
];

const structure = makeStructure(
  'cs-struct',
  '连锁门店结构',
  components.map((c) => c.id),
);

const sampleEmployees = generateEmployees({
  idPrefix: 'cs',
  empNoPrefix: 'CS',
  structureId: structure.id,
  slots: [
    { department: '一号门店', position: '店长', level: 'P4', count: 1 },
    { department: '一号门店', position: '咨询师', level: 'P3', count: 3 },
    { department: '一号门店', position: '护士', level: 'P2', count: 3 },
    { department: '一号门店', position: '门店助理', level: 'P1', count: 2 },
    { department: '二号门店', position: '店长', level: 'P3', count: 1 },
    { department: '二号门店', position: '咨询师', level: 'P3', count: 2 },
    { department: '二号门店', position: '护士', level: 'P2', count: 3 },
    { department: '二号门店', position: '门店助理', level: 'P1', count: 2 },
    { department: '三号门店', position: '店长', level: 'P3', count: 1 },
    { department: '三号门店', position: '咨询师', level: 'P3', count: 2 },
    { department: '三号门店', position: '护士', level: 'P2', count: 3 },
    { department: '三号门店', position: '门店助理', level: 'P1', count: 2 },
    { department: '四号门店', position: '店长', level: 'P3', count: 1 },
    { department: '四号门店', position: '咨询师', level: 'P3', count: 2 },
    { department: '四号门店', position: '护士', level: 'P2', count: 2 },
    { department: '四号门店', position: '门店助理', level: 'P1', count: 2 },
    { department: '运营中心', position: '区域经理', level: 'P4', count: 1 },
    { department: '运营中心', position: '运营专员', level: 'P2', count: 3 },
    { department: '运营中心', position: '培训专员', level: 'P3', count: 1 },
    { department: '支持中心', position: '市场专员', level: 'P2', count: 2 },
    { department: '支持中心', position: '客服专员', level: 'P2', count: 3 },
  ],
});

export const chainStoreTemplate: PayTemplate = {
  id: 'tpl-chain-store',
  name: '连锁门店',
  category: 'chain-store',
  builtIn: true,
  payload: {
    components,
    structures: [structure],
    sampleEmployees,
  },
  createdAt: 0,
  updatedAt: 0,
  deleted: false,
  deletedAt: null,
};
