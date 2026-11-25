// 通用服务业模板：覆盖固定/外部/比例/积木/扣项，适合大多数职能岗位
import type { PayTemplate } from '../../types';
import {
  makeComponent,
  makeEmployee,
  makeStructure,
} from '../entityFactory';

const components = [
  makeComponent({
    id: 'gs-base',
    code: 'GS_BASE',
    name: '基本工资',
    calcConfig: { kind: 'fixed', amount: 6000 },
  }),
  makeComponent({
    id: 'gs-post',
    code: 'GS_POST',
    name: '岗位工资',
    calcConfig: { kind: 'fixed', amount: 2000 },
  }),
  makeComponent({
    id: 'gs-perf',
    code: 'GS_PERF',
    name: '绩效工资',
    calcConfig: {
      kind: 'external',
      inputKey: 'performance',
      coefficient: 1,
      fallback: 0,
    },
  }),
  makeComponent({
    id: 'gs-merit',
    code: 'GS_MERIT',
    name: '工龄津贴',
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
    calcConfig: { kind: 'fixed', amount: 300 },
  }),
  makeComponent({
    id: 'gs-block',
    code: 'GS_BLOCK',
    name: '积木奖励',
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
    nature: 'deduction',
    calcConfig: { kind: 'fixed', amount: 0 },
  }),
];

const structure = makeStructure(
  'gs-struct',
  '通用服务业结构',
  components.map((c) => c.id),
);

const sampleEmployees = [
  makeEmployee({
    id: 'gs-emp-1',
    empNo: 'GS001',
    name: '王敏',
    department: '综合部',
    position: '行政专员',
    level: 'P2',
    structureId: structure.id,
    hireDate: '2024-03-01',
  }),
  makeEmployee({
    id: 'gs-emp-2',
    empNo: 'GS002',
    name: '陈杰',
    department: '运营部',
    position: '运营专员',
    level: 'P2',
    structureId: structure.id,
    hireDate: '2025-06-15',
  }),
];

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
