// 左侧导航配置：分组、路径、图标集中管理
import {
  BarChart3,
  Calculator,
  Layers,
  LayoutDashboard,
  Puzzle,
  Scale,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: '总览',
    items: [{ path: '/', label: '首页总览', icon: LayoutDashboard }],
  },
  {
    title: '薪酬设计',
    items: [
      { path: '/components', label: '组件库', icon: Puzzle },
      { path: '/structures', label: '薪酬结构', icon: Layers },
    ],
  },
  {
    title: '算薪',
    items: [
      { path: '/employees', label: '员工管理', icon: Users },
      { path: '/payroll', label: '算薪工作台', icon: Calculator },
    ],
  },
  {
    title: '分析',
    items: [
      { path: '/reports', label: '报表中心', icon: BarChart3 },
      { path: '/equity', label: '公平性分析', icon: Scale },
    ],
  },
  {
    title: '设置',
    items: [{ path: '/settings', label: '参数与设置', icon: Settings }],
  },
];

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_GROUPS.flatMap((g) => g.items).find((i) => i.path === pathname);
}
