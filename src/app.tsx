// 应用根：全局数据 Provider + 布局路由 + 各页面（路由懒加载）
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PayrollProvider, SchemeProvider } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingProvider, OnboardingWidget } from '@/components/business/onboarding';
import { Toaster } from '@/components/ui/sonner';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ComponentsPage = lazy(() => import('@/pages/ComponentsPage'));
const StructuresPage = lazy(() => import('@/pages/StructuresPage'));
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'));
const PayrollPage = lazy(() => import('@/pages/PayrollPage'));
const SandboxPage = lazy(() => import('@/pages/SandboxPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const EquityPage = lazy(() => import('@/pages/EquityPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const DemoPage = lazy(() => import('@/pages/DemoPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
      加载中…
    </div>
  );
}

export default function App() {
  return (
    <PayrollProvider>
      <SchemeProvider>
        <OnboardingProvider>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/components" element={<ComponentsPage />} />
              <Route path="/structures" element={<StructuresPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/payroll" element={<PayrollPage />} />
              <Route path="/sandbox" element={<SandboxPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/equity" element={<EquityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            <Route path="/demo" element={<DemoPage />} />
          </Routes>
        </Suspense>
          <OnboardingWidget />
        </OnboardingProvider>
      </SchemeProvider>
      <Toaster richColors position="top-center" />
    </PayrollProvider>
  );
}
