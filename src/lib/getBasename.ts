/**
 * 解析 React Router 的 basename（应用在当前域名下的挂载路径）
 *
 * 不能直接使用 import.meta.env.BASE_URL：妙搭构建时该值是指向 CDN 的完整跨域地址，
 * 作为 Router basename 会使当前路径无法匹配，导致整页白屏。
 * 改为运行时基于当前 pathname 推断挂载点，兼容妙搭、本地开发与子路径自托管。
 */
const INTERNAL_ROUTE_SEGMENTS = [
  'components',
  'structures',
  'employees',
  'payroll',
  'reports',
  'equity',
  'settings',
  'demo',
] as const;

export function getBasename(pathname: string = window.location.pathname): string {
  // 命中已知内部路由段时剥离最后一段，剩余即挂载点
  const pattern = new RegExp(`^(.*)/(${INTERNAL_ROUTE_SEGMENTS.join('|')})/?$`);
  const match = pathname.match(pattern);
  let base = match ? match[1] : pathname;

  // 规范化：去除尾部斜杠，根路径统一返回 "/"
  base = base.replace(/\/+$/, '');
  return base === '' ? '/' : base;
}
