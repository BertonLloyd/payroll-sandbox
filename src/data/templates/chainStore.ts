// 连锁门店模板：低固定 + 业绩提成，条件积木实现分段提成，贴合门店/口腔等场景
import type { PayTemplate } from '../../types';
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

const components = [
  makeComponent({
    id: 'cs-base',
    code: 'CS_BASE',
    name: '基本工资',
    calcConfig: { kind: 'fixed', amount: 5000 },
  }),
  makeComponent({
    id: 'cs-post',
    code: 'CS_POST',
    name: '岗位工资',
    calcConfig: { kind: 'fixed', amount: 1500 },
  }),
  makeComponent({
    id: 'cs-commission',
    code: 'CS_COMM',
    name: '业绩提成',
    calcConfig: {
      kind: 'blocks',
      ast: {
        type: 'condition',
        branches: [
          {
            when: {
              type: 'compare',
              op: '>',
              left: salesRef,
              right: 50000,
            },
            then: {
              type: 'math',
              op: '*',
              operands: [
                salesRef,
                { type: 'ref', refType: 'constant', value: 0.08 },
              ],
            },
          },
        ],
        else: {
          type: 'math',
          op: '*',
          operands: [
            salesRef,
            { type: 'ref', refType: 'constant', value: 0.05 },
          ],
        },
      },
    },
  }),
  makeComponent({
    id: 'cs-allow',
    code: 'CS_ALLOW',
    name: '门店津贴',
    calcConfig: { kind: 'fixed', amount: 500 },
  }),
  makeComponent({
    id: 'cs-deduct',
    code: 'CS_DEDUCT',
    name: '考勤扣款',
    nature: 'deduction',
    calcConfig: { kind: 'fixed', amount: 0 },
  }),
];

const structure = makeStructure(
  'cs-struct',
  '连锁门店结构',
  components.map((c) => c.id),
);

const sampleEmployees = [
  makeEmployee({
    id: 'cs-emp-1',
    empNo: 'CS001',
    name: '赵倩',
    department: '一号门店',
    position: '咨询师',
    level: 'P3',
    structureId: structure.id,
    hireDate: '2023-09-01',
  }),
  makeEmployee({
    id: 'cs-emp-2',
    empNo: 'CS002',
    name: '孙磊',
    department: '二号门店',
    position: '门店助理',
    level: 'P1',
    structureId: structure.id,
    hireDate: '2025-10-20',
  }),
];

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
