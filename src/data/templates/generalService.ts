// 通用服务业模板：固定+绩效系数+积木奖金+工龄奖+考勤联动全勤奖+考勤扣款，覆盖月度录入与考勤 Excel 全流程
import type { PayTemplate } from '../../types';
import {
  makeComponent,
  makeStructure,
} from '../entityFactory';
import { generateEmployees } from './employeeGenerator';

const components = [
  makeComponent({
    id: 'gs-base',
    code: 'GS_BASE',
    name: '基本工资',
    description: '固定金额，每月 6000 元',
    calcConfig: { kind: 'fixed', amount: 6000 },
  }),
  makeComponent({
    id: 'gs-post',
    code: 'GS_POST',
    name: '岗位工资',
    description: '固定金额，每月 2000 元',
    calcConfig: { kind: 'fixed', amount: 2000 },
  }),
  makeComponent({
    id: 'gs-perf',
    code: 'GS_PERF',
    name: '绩效工资',
    description: '基数为基本工资+岗位工资，工作台只录绩效系数，按基数×系数计算',
    calcConfig: {
      kind: 'performance',
      baseMode: 'components',
      baseAmount: 0,
      baseComponentIds: ['gs-base', 'gs-post'],
      inputLabel: '绩效系数',
      defaultCoefficient: 1,
    },
  }),
  makeComponent({
    id: 'gs-block',
    code: 'GS_BLOCK',
    name: '奖金',
    description: '基本工资 × 2%',
    calcConfig: {
      kind: 'blocks',
      ast: {
        type: 'math',
        op: '*',
        operands: [
          { type: 'ref', refType: 'component', componentId: 'gs-base' },
          { type: 'ref', refType: 'constant', value: 0.02 },
        ],
      },
    },
  }),
  makeComponent({
    id: 'gs-merit',
    code: 'GS_MERIT',
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
    id: 'gs-full',
    code: 'GS_FULL',
    name: '全勤奖',
    description: '与考勤联动，无缺勤即发 300 元，否则 0',
    calcConfig: {
      kind: 'fullAttendance',
      amount: 300,
      requireNoAbsent: true,
      requireNoSick: false,
      requireNoHourLeave: false,
      attendanceComponentId: 'gs-att',
    },
  }),
  makeComponent({
    id: 'gs-att',
    code: 'GS_ATT',
    name: '考勤扣款',
    description: '按应出勤、实际出勤、小时假、病假折算；病假每天扣日工资20%',
    nature: 'deduction',
    calcConfig: {
      kind: 'attendance',
      baseMode: 'components',
      baseAmount: 0,
      baseComponentIds: ['gs-base', 'gs-post'],
      dayDivisor: 'actual',
      statutoryDays: 21.75,
      workHoursPerDay: 8,
      sickBaseMode: 'base',
      sickBaseComponentIds: ['gs-base'],
      sickMinimumAmount: 0,
      sickDeductRate: 0.2,
    },
  }),
];

const structure = makeStructure(
  'gs-struct',
  '通用服务业结构',
  components.map((c) => c.id),
);

const sampleEmployees = generateEmployees({
  idPrefix: 'gs',
  empNoPrefix: 'GS',
  structureId: structure.id,
  slots: [
    { department: '综合部', position: '行政专员', level: 'P2', count: 3 },
    { department: '综合部', position: '人事专员', level: 'P2', count: 2 },
    { department: '综合部', position: '行政主管', level: 'P3', count: 1 },
    { department: '运营部', position: '运营专员', level: 'P2', count: 10 },
    { department: '运营部', position: '运营主管', level: 'P3', count: 3 },
    { department: '运营部', position: '运营经理', level: 'P4', count: 1 },
    { department: '财务部', position: '会计', level: 'P2', count: 3 },
    { department: '财务部', position: '出纳', level: 'P1', count: 2 },
    { department: '财务部', position: '财务主管', level: 'P3', count: 1 },
    { department: '市场部', position: '市场专员', level: 'P2', count: 6 },
    { department: '市场部', position: '市场主管', level: 'P3', count: 2 },
    { department: '客服部', position: '客服专员', level: 'P1', count: 4 },
    { department: '客服部', position: '客服专员', level: 'P2', count: 5 },
    { department: '客服部', position: '客服主管', level: 'P3', count: 2 },
  ],
});

export const generalServiceTemplate: PayTemplate = {
  id: 'tpl-general-service',
  name: '通用服务业',
  category: 'general-service',
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
