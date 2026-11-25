// 内置数据实体工厂：补审计字段与默认值，模板构造更简洁
import type {
  CalcConfig,
  Employee,
  Nature,
  PayComponent,
  PayStructure,
  TaxTreatment,
} from '../types';

const audit = () => ({
  createdAt: 0,
  updatedAt: 0,
  deleted: false,
  deletedAt: null,
});

export function makeComponent(input: {
  id: string;
  code: string;
  name: string;
  nature?: Nature;
  taxTreatment?: TaxTreatment;
  calcConfig: CalcConfig;
  period?: PayComponent['period'];
  scope?: PayComponent['scope'];
  status?: PayComponent['status'];
}): PayComponent {
  return {
    ...audit(),
    nature: 'earning',
    taxTreatment: 'pretax',
    period: 'monthly',
    scope: 'all',
    status: 'active',
    ...input,
    calcType: input.calcConfig.kind,
  };
}

export function makeStructure(
  id: string,
  name: string,
  componentIds: string[],
): PayStructure {
  const groupId = `${id}-group`;
  return {
    ...audit(),
    id,
    name,
    description: '',
    status: 'active',
    groups: [{ id: groupId, name: '薪酬项', order: 0 }],
    items: componentIds.map((componentId, i) => ({
      id: `${id}-item-${i}`,
      componentId,
      groupId,
      order: i,
    })),
  };
}

type EmployeeInput = Omit<
  Employee,
  'createdAt' | 'updatedAt' | 'deleted' | 'deletedAt' | 'status' | 'overrides'
> &
  Partial<Pick<Employee, 'status' | 'overrides'>>;

export function makeEmployee(input: EmployeeInput): Employee {
  return {
    ...audit(),
    status: 'active',
    overrides: [],
    ...input,
  };
}
