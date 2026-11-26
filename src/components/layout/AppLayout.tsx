// 应用外壳：左侧固定导航 + 顶部标题栏 + 主内容区
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV_GROUPS, findNavItem } from './nav';
import { SchemeSwitcher } from '@/components/business/scheme/SchemeSwitcher';

export function AppLayout() {
  const location = useLocation();
  const current = findNavItem(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <span className="text-base font-bold text-foreground">
            薪酬测算沙盘
          </span>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-2 text-xs font-medium text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                      ].join(' ')
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-6">
          <h1 className="text-base font-semibold text-foreground">
            {current?.label ?? '薪酬测算沙盘'}
          </h1>
          <div className="ml-auto">
            <SchemeSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
