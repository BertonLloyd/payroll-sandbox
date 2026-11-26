// 销售型模板：高浮动、外部 KPI 驱动、积木公式、多扣项
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
    id: 'sl-comm',
    code: 'SL_COMM',
    name: '销售提成',
    description: '每月录入绩效得分，按得分计算',
    calcConfig: {
      kind: 'external',
      inputKey: 'kpi',
      label: '绩效得分',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'sl-mgmt',
    code: 'SL_MGMT',
    name: '管理津贴',
    description: '固定金额，每月 1000 元',
    calcConfig: { kind: 'fixed', amount: 1000 },
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
