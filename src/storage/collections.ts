// 集合定义与引擎路由：配置类小数据走 localStorage，大块历史数据走 IndexedDB

export const COLLECTIONS = {
  components: 'components',
  structures: 'structures',
  employees: 'employees',
  templates: 'templates',
  paramPacks: 'paramPacks',
  monthlyInputs: 'monthlyInputs',
  paySlips: 'paySlips',
} as const;

export type CollectionName =
  (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

const LOCAL: CollectionName[] = [
  COLLECTIONS.components,
  COLLECTIONS.structures,
  COLLECTIONS.employees,
  COLLECTIONS.templates,
  COLLECTIONS.paramPacks,
];

const IDB: CollectionName[] = [
  COLLECTIONS.monthlyInputs,
  COLLECTIONS.paySlips,
];

export function isLocalCollection(name: CollectionName): boolean {
  return LOCAL.includes(name);
}

export function isIdbCollection(name: CollectionName): boolean {
  return IDB.includes(name);
}

// 工资条/外部输入按 年-月 分片，避免单 key 过大
export function periodKey(collection: CollectionName, year: number, month: number): string {
  return `${collection}/${year}-${String(month).padStart(2, '0')}`;
}
