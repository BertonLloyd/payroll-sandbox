// 月度录入字段统一收集：external / performance / attendance 声明各自字段，全勤奖复用考勤字段
// 字段 key 由组件 id 确定性派生，保证多组件、多方案下唯一；external 沿用其 inputKey
import type { PayComponent } from '@/types';

export interface InputFieldSpec {
  key: string;
  label: string;
  group: string; // 分组：考勤 / 绩效 / 外部数据
}

// 考勤四字段 key
export function attendanceFieldKeys(componentId: string) {
  return {
    attend: `${componentId}__attend`,
    actual: `${componentId}__actual`,
    hour: `${componentId}__hour`,
    sick: `${componentId}__sick`,
  };
}

// 绩效系数字段 key
export function performanceFieldKey(componentId: string) {
  return `${componentId}__coef`;
}

// 单个组件声明的录入字段
export function collectComponentInputFields(
  component: PayComponent,
): InputFieldSpec[] {
  const cfg = component.calcConfig;
  switch (cfg.kind) {
    case 'external':
      return cfg.inputKey
        ? [{ key: cfg.inputKey, label: cfg.label || cfg.inputKey, group: '外部数据' }]
        : [];
    case 'performance':
      return [
        {
          key: performanceFieldKey(component.id),
          label: cfg.inputLabel || '绩效系数',
          group: '绩效',
        },
      ];
    case 'attendance': {
      const k = attendanceFieldKeys(component.id);
      return [
        { key: k.attend, label: '应出勤天数', group: '考勤' },
        { key: k.actual, label: '实际出勤天数', group: '考勤' },
        { key: k.hour, label: '小时假(小时)', group: '考勤' },
        { key: k.sick, label: '病假天数', group: '考勤' },
      ];
    }
    default:
      return [];
  }
}

// 多个组件汇总全部录入字段，按出现顺序去重
export function collectAllInputFields(
  components: PayComponent[],
): InputFieldSpec[] {
  const seen = new Map<string, InputFieldSpec>();
  for (const component of components) {
    for (const field of collectComponentInputFields(component)) {
      if (!seen.has(field.key)) seen.set(field.key, field);
    }
  }
  return [...seen.values()];
}
