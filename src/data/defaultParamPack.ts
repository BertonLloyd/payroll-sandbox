// 内置默认个税社保参数包：企业可在设置中编辑、另存为多地区方案
import type { TaxParamPack } from '../types';

export function makeDefaultParamPack(): TaxParamPack {
  return {
    id: 'builtin-param-pack',
    name: '通用个税社保参数（可编辑）',
    region: '通用',
    isDefault: true,
    status: 'active',
    tax: {
      threshold: 5000,
      brackets: [
        { upTo: 3000, rate: 0.03, deduct: 0 },
        { upTo: 12000, rate: 0.1, deduct: 210 },
        { upTo: 25000, rate: 0.2, deduct: 1410 },
        { upTo: 35000, rate: 0.25, deduct: 2660 },
        { upTo: 55000, rate: 0.3, deduct: 4410 },
        { upTo: 80000, rate: 0.35, deduct: 7160 },
        { upTo: Number.POSITIVE_INFINITY, rate: 0.45, deduct: 15160 },
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
      {
        name: '工伤保险',
        employerRate: 0.005,
        employeeRate: 0,
        baseMin: 0,
        baseMax: 30000,
      },
      {
        name: '生育保险',
        employerRate: 0.007,
        employeeRate: 0,
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
    createdAt: 0,
    updatedAt: 0,
    deleted: false,
    deletedAt: null,
  };
}
