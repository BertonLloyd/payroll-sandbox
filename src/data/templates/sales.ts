// 销售型模板：低底薪 + 高浮动，多档条件积木实现阶梯提成
import type { BlockNode, PayTemplate } from '../../types';
import {
  makeComponent,
  makeEmployee,
  makeStructure,
} from '../entityFactory';

const salesRef = {
  type: 'ref',
  refType: 'input',
  inputKey: 'sales',
} as const;

const rate = (r: number): BlockNode => ({
  type: 'math',
  op: '*',
  operands: [salesRef, { type: 'ref', refType: 'constant', value: r }],
});

const components = [
  makeComponent({
    id: 'sl-base',
    code: 'SL_BASE',
    name: '基本工资',
    calcConfig: { kind: 'fixed', amount: 4000 },
  }),
  makeComponent({
    id: 'sl-kpi',
    code: 'SL_KPI',
    name: '绩效工资',
    calcConfig: {
      kind: 'external',
      inputKey: 'kpi',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'sl-commission',
    code: 'SL_COMM',
    name: '阶梯提成',
    calcConfig: {
      kind: 'blocks',
      ast: {
        type: 'condition',
        branches: [
          {
            when: { type: 'compare', op: '>', left: salesRef, right: 80000 },
            then: rate(0.1),
          },
          {
            when: { type: 'compare', op: '>', left: salesRef, right: 30000 },
            then: rate(0.06),
          },
        ],
        else: rate(0.03),
      },
    },
  }),
  makeComponent({
    id: 'sl-allow',
    code: 'SL_ALLOW',
    name: '通讯补贴',
    calcConfig: { kind: 'fixed', amount: 200 },
  }),
  makeComponent({
    id: 'sl-deduct',
    code: 'SL_DEDUCT',
    name: '考勤扣款',
    nature: 'deduction',
    calcConfig: { kind: 'fixed', amount: 0 },
  }),
];

const structure = makeStructure(
  'sl-struct',
  '销售型结构',
  components.map((c) => c.id),
);

const sampleEmployees = [
  makeEmployee({
    id: 'sl-emp-1',
    empNo: 'SL001',
    name: '周涛',
    department: '销售一部',
    position: '高级销售',
    level: 'P4',
    structureId: structure.id,
    hireDate: '2022-07-01',
  }),
];

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
