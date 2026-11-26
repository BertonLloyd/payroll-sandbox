// repository 工厂：基于默认存储管理器构建全部 repository（单例）
import { getStorageManager } from '../storage/factory';
import { SchemeRepository } from './SchemeRepository';
import { ComponentRepository } from './ComponentRepository';
import { StructureRepository } from './StructureRepository';
import { EmployeeRepository } from './EmployeeRepository';
import { TemplateRepository } from './TemplateRepository';
import { ParamPackRepository } from './ParamPackRepository';
import { PaySlipRepository } from './PaySlipRepository';
import { MonthlyInputRepository } from './MonthlyInputRepository';

export interface Repositories {
  schemes: SchemeRepository;
  components: ComponentRepository;
  structures: StructureRepository;
  employees: EmployeeRepository;
  templates: TemplateRepository;
  paramPacks: ParamPackRepository;
  paySlips: PaySlipRepository;
  monthlyInputs: MonthlyInputRepository;
}

let cache: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!cache) {
    const sm = getStorageManager();
    cache = {
      schemes: new SchemeRepository(sm),
      components: new ComponentRepository(sm),
      structures: new StructureRepository(sm),
      employees: new EmployeeRepository(sm),
      templates: new TemplateRepository(sm),
      paramPacks: new ParamPackRepository(sm),
      paySlips: new PaySlipRepository(sm),
      monthlyInputs: new MonthlyInputRepository(sm),
    };
  }
  return cache;
}
