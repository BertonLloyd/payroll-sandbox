// 组件计算配置的中文规则摘要与保存校验，供组件列表、表单、覆盖弹窗复用
import type { CalcConfig, CalcType } from '@/types';

export const CALC_TYPE_LABELS: Record<CalcType, string> = {
  fixed: '固定金额',
  ratio: '按比例',
  blocks: '积木公式',
  tiered: '阶梯分段',
  external: '外部输入',
  performance: '绩效系数',
  attendance: '考勤扣款',
  fullAttendance: '全勤奖',
  seniority: '工龄奖',
};

// 名称解析：把组件 id 转中文名，缺省回退占位
type ResolveName = (id: string) => string | undefined;

// 基数描述：固定金额或引用组件求和
function describeBase(
  cfg: { baseMode: 'fixed' | 'components'; baseAmount: number; baseComponentIds: string[] },
  resolveName?: ResolveName,
): string {
  if (cfg.baseMode === 'fixed') return `${formatAmount(cfg.baseAmount)} 元`;
  if (cfg.baseComponentIds.length === 0) return '未选基数';
  return cfg.baseComponentIds
    .map((id) => resolveName?.(id) ?? '组件')
    .join(' + ');
}

// 规则摘要：一行中文写清“怎么算”
export function describeCalcConfig(
  config: CalcConfig,
  resolveName?: ResolveName,
): string {
  switch (config.kind) {
    case 'fixed':
      return `固定金额 · ${formatAmount(config.amount)} 元`;
    case 'ratio': {
      const base = resolveName?.(config.baseComponentId) ?? '未选基数';
      return `按比例 · ${base} × ${formatPercent(config.ratio)}`;
    }
    case 'blocks':
      return '积木公式 · 已配置规则';
    case 'tiered': {
      const base = resolveName?.(config.baseComponentId) ?? '未选基数';
      return `阶梯分段 · ${base} · ${config.brackets.length} 档`;
    }
    case 'external': {
      const field = config.label || config.inputKey || '未命名字段';
      return `外部输入 · 每月录入「${field}」`;
    }
    case 'performance':
      return `绩效系数 · 基数「${describeBase(config, resolveName)}」× 每月录入系数`;
    case 'attendance':
      return `考勤扣款 · 日工资折算缺勤/小时假/病假 · 病假扣 ${formatPercent(config.sickDeductRate)}`;
    case 'fullAttendance': {
      const conditions = [
        config.requireNoAbsent ? '无缺勤' : null,
        config.requireNoSick ? '无病假' : null,
        config.requireNoHourLeave ? '无小时假' : null,
      ]
        .filter(Boolean)
        .join('、');
      return `全勤奖 · 满足「${conditions}」发 ${formatAmount(config.amount)} 元，否则 0`;
    }
    case 'seniority':
      return `工龄奖 · 按入职日期自动算 · ${config.brackets.length} 档`;
  }
}

// 保存校验：返回错误文案，通过则返回 null
export function validateCalcConfig(config: CalcConfig): string | null {
  switch (config.kind) {
    case 'fixed':
      if (!Number.isFinite(config.amount)) return '请填写固定金额';
      return null;
    case 'ratio':
      if (!config.baseComponentId) return '请选择计算基数组件';
      if (!Number.isFinite(config.ratio)) return '请填写比例';
      return null;
    case 'blocks':
      return null;
    case 'tiered':
      if (!config.baseComponentId) return '请选择计算基数组件';
      if (config.brackets.length === 0) return '请至少添加一个分段';
      return null;
    case 'external':
      if (!config.inputKey.trim()) return '请填写输入字段标识';
      if (!Number.isFinite(config.coefficient)) return '请填写系数';
      if (!Number.isFinite(config.fallback)) return '请填写缺省值';
      return null;
    case 'performance':
      if (config.baseMode === 'components' && config.baseComponentIds.length === 0)
        return '请选择绩效基数组件';
      if (!config.inputLabel.trim()) return '请填写录入字段名称';
      if (!Number.isFinite(config.defaultCoefficient)) return '请填写缺省系数';
      return null;
    case 'attendance':
      if (config.baseMode === 'components' && config.baseComponentIds.length === 0)
        return '请选择月工资基数组件';
      if (!(config.statutoryDays > 0)) return '法定计薪天数需大于 0';
      if (!(config.workHoursPerDay > 0)) return '日工时需大于 0';
      if (config.sickBaseMode === 'base' && config.sickBaseComponentIds.length === 0)
        return '请选择病假基本工资组件';
      if (config.sickBaseMode === 'minimum' && !Number.isFinite(config.sickMinimumAmount))
        return '请填写当地最低工资';
      if (!Number.isFinite(config.sickDeductRate)) return '请填写病假扣款比例';
      return null;
    case 'fullAttendance':
      if (!config.attendanceComponentId) return '请选择关联的考勤组件';
      if (!Number.isFinite(config.amount)) return '请填写全勤奖金额';
      return null;
    case 'seniority':
      if (config.brackets.length === 0) return '请至少添加一档工龄奖';
      return null;
  }
}

function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
