// 引擎逻辑验证（临时脚本，esbuild 打包后用 node 运行）
import { calcPayroll } from '../src/engine/calcPayroll';
import { topoSort } from '../src/engine/topoSort';
import type {
  Employee,
  PayComponent,
  PayStructure,
  TaxParamPack,
} from '../src/types';

const now = Date.now();
const audit = () => ({
  createdAt: now,
  updatedAt: now,
  deleted: false,
  deletedAt: null,
});

// ---- 组件：覆盖 fixed / external / ratio / tiered / blocks / deduction ----
const baseSalary: PayComponent = {
  ...audit(),
  id: 'c-base',
  code: 'BASE',
  name: '基本工资',
  nature: 'earning',
  taxTreatment: 'pretax',
  calcType: 'fixed',
  calcConfig: { kind: 'fixed', amount: 10000 },
  period: 'monthly',
  scope: 'all',
  status: 'active',
};

const performancePay: PayComponent = {
  ...audit(),
  id: 'c-perf',
  code: 'PERF',
  name: '绩效工资',
  nature: 'earning',
  taxTreatment: 'pretax',
  calcType: 'external',
  calcConfig: {
    kind: 'external',
    inputKey: 'performance',
    coefficient: 1,
    fallback: 0,
  },
  period: 'monthly',
  scope: 'all',
  status: 'active',
};

const meritRatio: PayComponent = {
  ...audit(),
  id: 'c-ratio',
  code: 'RATIO',
  name: '工龄津贴',
  nature: 'earning',
  taxTreatment: 'pretax',
  calcType: 'ratio',
  calcConfig: {
    kind: 'ratio',
    baseComponentId: 'c-base',
    ratio: 0.1,
    roundRule: { decimals: 2, mode: 'halfUp' },
  },
  period: 'monthly',
  scope: 'all',
  status: 'active',
};

const bonusTier: PayComponent = {
  ...audit(),
  id: 'c-tier',
  code: 'TIER',
  name: '阶梯奖金',
  nature: 'earning',
  taxTreatment: 'pretax',
  calcType: 'tiered',
  calcConfig: {
    kind: 'tiered',
    baseComponentId: 'c-base',
    brackets: [
      { upTo: 5000, rate: 0.05, deduct: 0 },
      { upTo: 20000, rate: 0.1, deduct: 250 },
    ],
  },
  period: 'monthly',
  scope: 'all',
  status: 'active',
};

const blockAllow: PayComponent = {
  ...audit(),
  id: 'c-block',
  code: 'BLOCK',
  name: '积木津贴',
  nature: 'earning',
  taxTreatment: 'pretax',
  calcType: 'blocks',
  calcConfig: {
    kind: 'blocks',
    ast: {
      type: 'math',
      op: '*',
      operands: [
        { type: 'ref', refType: 'component', componentId: 'c-base' },
        { type: 'ref', refType: 'constant', value: 0.05 },
      ],
    },
  },
  period: 'monthly',
  scope: 'all',
  status: 'active',
};

const attendanceDeduct: PayComponent = {
  ...audit(),
  id: 'c-deduct',
  code: 'ATT',
  name: '考勤扣款',
  nature: 'deduction',
  taxTreatment: 'pretax',
  calcType: 'fixed',
  calcConfig: { kind: 'fixed', amount: 500 },
  period: 'monthly',
  scope: 'all',
  status: 'active',
};

const components = [
  baseSalary,
  performancePay,
  meritRatio,
  bonusTier,
  blockAllow,
  attendanceDeduct,
];

// ---- 参数包 ----
const paramPack: TaxParamPack = {
  ...audit(),
  id: 'pack',
  name: '默认参数包',
  region: '通用',
  isDefault: true,
  status: 'active',
  tax: {
    threshold: 5000,
    brackets: [
      { upTo: 3000, rate: 0.03, deduct: 0 },
      { upTo: 12000, rate: 0.1, deduct: 210 },
    ],
  },
  social: [
    {
      name: '养老保险',
      employerRate: 0.16,
      employeeRate: 0.08,
      baseMin: 0,
      baseMax: 30000,
    },
    {
      name: '医疗保险',
      employerRate: 0.08,
      employeeRate: 0.02,
      baseMin: 0,
      baseMax: 30000,
    },
    {
      name: '失业保险',
      employerRate: 0.005,
      employeeRate: 0.005,
      baseMin: 0,
      baseMax: 30000,
    },
  ],
  fund: {
    name: '住房公积金',
    employerRate: 0.12,
    employeeRate: 0.12,
    baseMin: 0,
    baseMax: 30000,
  },
};

// ---- 结构 ----
const structure: PayStructure = {
  ...audit(),
  id: 'struct',
  name: '默认结构',
  description: '',
  status: 'active',
  groups: [{ id: 'g1', name: '默认分组', order: 0 }],
  items: components.map((c, i) => ({
    id: `si-${c.id}`,
    componentId: c.id,
    groupId: 'g1',
    order: i,
  })),
};

// ---- 员工 ----
const employee: Employee = {
  ...audit(),
  id: 'emp',
  empNo: 'E001',
  name: '测试员工',
  department: '综合部',
  position: '专员',
  level: 'P1',
  structureId: 'struct',
  hireDate: '2026-01-01',
  status: 'active',
  overrides: [],
};

const slip = calcPayroll({
  employee,
  structure,
  components,
  paramPack,
  inputValues: { performance: 3000 },
  year: 2026,
  month: 11,
});

console.log(JSON.stringify(slip, null, 2));

// ---- 断言 ----
const checks: [string, boolean][] = [
  ['gross 应发=15250', slip.gross === 15250],
  ['阶梯奖金=750', slip.lines.find((l) => l.componentId === 'c-tier')!.amount === 750],
  ['积木津贴=500', slip.lines.find((l) => l.componentId === 'c-block')!.amount === 500],
  ['社保个人=3431.25', slip.lines.find((l) => l.componentId === '__social__')!.amount === 3431.25],
  ['个税=421.88', slip.tax === 421.88],
  ['实发=10896.87', slip.net === 10896.87],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}

// 循环检测
let cycleCaught = false;
try {
  topoSort(
    ['a', 'b'],
    new Map([
      ['a', ['b']],
      ['b', ['a']],
    ]),
  );
} catch {
  cycleCaught = true;
}
console.log(`${cycleCaught ? 'PASS' : 'FAIL'}  循环引用被检测`);
if (!cycleCaught) failed += 1;

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
