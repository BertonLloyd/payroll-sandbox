// 通用服务业模板：覆盖固定/外部/比例/积木/扣项，适合大多数职能岗位
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
    description: '每月录入绩效系数，按系数计算',
    calcConfig: {
      kind: 'external',
      inputKey: 'performance',
      label: '绩效系数',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'gs-merit',
    code: 'GS_MERIT',
    name: '工龄津贴',
    description: '基本工资 × 5%',
    calcConfig: {
      kind: 'ratio',
      baseComponentId: 'gs-base',
      ratio: 0.05,
      roundRule: { decimals: 2, mode: 'halfUp' },
    },
  }),
  makeComponent({
    id: 'gs-full',
    code: 'GS_FULL',
    name: '全勤奖',
    description: '固定金额，每月 300 元',
    calcConfig: { kind: 'fixed', amount: 300 },
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
    id: 'gs-att',
    code: 'GS_ATT',
    name: '考勤扣款',
    description: '固定金额，缺省为 0 元',
    nature: 'deduction',
    calcConfig: { kind: 'fixed', amount: 0 },
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
