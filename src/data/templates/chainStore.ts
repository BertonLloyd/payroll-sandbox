// 连锁门店模板：多门店、阶梯分段、积木公式、外部销售额驱动
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
    id: 'cs-perf',
    code: 'CS_PERF',
    name: '绩效工资',
    description: '每月录入销售额，按销售额计算',
    calcConfig: {
      kind: 'external',
      inputKey: 'sales',
      label: '销售额',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'cs-tier',
    code: 'CS_TIER',
    name: '阶梯提成',
    description: '按销售额分段，适用区间内按对应比例计提',
    calcConfig: {
      kind: 'tiered',
      baseComponentId: 'cs-perf',
      brackets: [
        { upTo: 50000, rate: 0.02, deduct: 0 },
        { upTo: 100000, rate: 0.03, deduct: 0 },
        { upTo: Infinity, rate: 0.05, deduct: 0 },
      ],
    },
  }),
  makeComponent({
    id: 'cs-block',
    code: 'CS_BLOCK',
    name: '奖金',
    description: '基本工资 × 3%',
    calcConfig: {
      kind: 'blocks',
      ast: {
        type: 'math',
        op: '*',
        operands: [
          { type: 'ref', refType: 'component', componentId: 'cs-base' },
          { type: 'ref', refType: 'constant', value: 0.03 },
        ],
      },
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
