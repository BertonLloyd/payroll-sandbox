import type { PayTemplate } from '../../types';
import { generalServiceTemplate } from './generalService';
import { chainStoreTemplate } from './chainStore';
import { salesTemplate } from './sales';

export { generalServiceTemplate, chainStoreTemplate, salesTemplate };

export const BUILTIN_TEMPLATES: PayTemplate[] = [
  generalServiceTemplate,
  chainStoreTemplate,
  salesTemplate,
];
