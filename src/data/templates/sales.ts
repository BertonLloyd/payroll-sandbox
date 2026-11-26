// 销售型模板：固定+管理津贴+销售提成+绩效系数+积木奖金+工龄奖+考勤联动全勤奖+考勤扣款，覆盖月度录入与考勤 Excel 全流程
import type { PayTemplate } from '../../types';
import {
  makeComponent,
  makeStructure,
} from '../entityFactory';
import { generateEmployees } from './employeeGenerator';

const components = [
  makeComponent({
    id: 'sl-base',
    code: 'SL_BASE',
    name: '基本工资',
    description: '固定金额，每月 5000 元',
    calcConfig: { kind: 'fixed', amount: 5000 },
  }),
  makeComponent({
    id: 'sl-mgmt',
    code: 'SL_MGMT',
    name: '管理津贴',
    description: '固定金额，每月 1000 元',
    calcConfig: { kind: 'fixed', amount: 1000 },
  }),
  makeComponent({
    id: 'sl-comm',
    code: 'SL_COMM',
    name: '销售提成',
    description: '每月在工作台录入绩效得分，按得分×系数计算',
    calcConfig: {
      kind: 'external',
      inputKey: 'kpi',
      label: '绩效得分',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'sl-perf',
    code: 'SL_PERF',
    name: '绩效工资',
    description: '基数为基本工资+管理津贴，工作台只录绩效系数，按基数×系数计算',
    calcConfig: {
      kind: 'performance',
      baseMode: 'components',
      baseAmount: 0,
      baseComponentIds: ['sl-base', 'sl-mgmt'],
      inputLabel: '绩效系数',
      defaultCoefficient: 1,
    },
  }),
  makeComponent({
    id: 'sl-block',
    code: 'SL_BLOCK',
    name: '奖金',
    description: '基本工资 × 4%',
    calcConfig: {
      kind: 'blocks',
      ast: {
        type: 'math',
        op: '*',
        operands: [
          { type: 'ref', refType: 'component', componentId: 'sl-base' },
          { type: 'ref', refType: 'constant', value: 0.04 },
        ],
      },
    },
  }),
  makeComponent({
    id: 'sl-senior',
    code: 'SL_SENIOR',
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
    id: 'sl-full',
    code: 'SL_FULL',
    name: '全勤奖',
    description: '与考勤联动，无缺勤即发 300 元，否则 0',
    calcConfig: {
      kind: 'fullAttendance',
      amount: 300,
      requireNoAbsent: true,
      requireNoSick: false,
      requireNoHourLeave: false,
      attendanceComponentId: 'sl-attend',
    },
  }),
  makeComponent({
    id: 'sl-attend',
    code: 'SL_ATTEND',
    name: '考勤扣款',
    description: '按应出勤、实际出勤、小时假、病假折算；病假每天扣日工资20%',
    nature: 'deduction',
    calcConfig: {
      kind: 'attendance',
      baseMode: 'components',
      baseAmount: 0,
      baseComponentIds: ['sl-base', 'sl-mgmt'],
      dayDivisor: 'actual',
      statutoryDays: 21.75,
      workHoursPerDay: 8,
      sickBaseMode: 'base',
      sickBaseComponentIds: ['sl-base'],
      sickMinimumAmount: 0,
      sickDeductRate: 0.2,
    },
  }),
  makeComponent({
    id: 'sl-si',
    code: 'SL_SI',
    name: '社保个人',
    description: '固定金额，缺省为 0 元',
    nature: 'deduction',
    taxTreatment: 'posttax',
    calcConfig: { kind: 'fixed', amount: 0 },
  }),
  makeComponent({
    id: 'sl-hf',
    code: 'SL_HF',
    name: '公积金个人',
    description: '固定金额，缺省为 0 元',
    nature: 'deduction',
    taxTreatment: 'posttax',
    calcConfig: { kind: 'fixed', amount: 0 },
  }),
];

const structure = makeStructure(
  'sl-struct',
  '销售型结构',
  components.map((c) => c.id),
);

const sampleEmployees = generateEmployees({
  idPrefix: 'sl',
  empNoPrefix: 'SL',
  structureId: structure.id,
  slots: [
    { department: '销售一部', position: '销售总监', level: 'P4', count: 1 },
    { department: '销售一部', position: '高级销售', level: 'P4', count: 3 },
    { department: '销售一部', position: '销售专员', level: 'P2', count: 8 },
    { department: '销售二部', position: '销售经理', level: 'P4', count: 1 },
    { department: '销售二部', position: '高级销售', level: 'P3', count: 2 },
    { department: '销售二部', position: '销售专员', level: 'P2', count: 7 },
    { department: '销售三部', position: '销售经理', level: 'P3', count: 1 },
    { department: '销售三部', position: '高级销售', level: 'P3', count: 2 },
    { department: '销售三部', position: '销售专员', level: 'P2', count: 6 },
    { department: '销售支持', position: '销售助理', level: 'P1', count: 4 },
    { department: '销售支持', position: '数据专员', level: 'P2', count: 2 },
    { department: '销售支持', position: '销售运营', level: 'P3', count: 1 },
    { department: '客户成功', position: '客户专员', level: 'P2', count: 2 },
  ],
});

export const salesTemplate: PayTemplate = {
  id: 'tpl-sales',
  name: '销售型',
  category: 'sales',
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
