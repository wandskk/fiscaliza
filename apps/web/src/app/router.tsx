import { Role } from '@fiscaliza/shared';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useMe } from '@/features/auth/hooks/use-me';
import { SignInPage } from '@/features/auth/pages/SignInPage';
import { homeForRole } from '@/features/auth/utils/role-navigation';
import { ConstructionSitesPage } from '@/features/construction-sites/pages/ConstructionSitesPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';

// The showcase only exists in dev builds
const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/design-system-page').then((m) => ({ default: m.DesignSystemPage })))
  : null;

// "/" sends each role to its own home (always inside ProtectedRoute, so /me is loaded)
function RoleHomeRedirect() {
  const { data: me } = useMe();
  return me ? <Navigate to={homeForRole(me.role)} replace /> : null;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      {DesignSystemPage && (
        <Route
          path="/design-system"
          element={
            <Suspense fallback={<div className="p-8 text-muted">Carregando vitrine...</div>}>
              <DesignSystemPage />
            </Suspense>
          }
        />
      )}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<RoleHomeRedirect />} />
          <Route path="/construction-sites" element={<ConstructionSitesPage />} />
          <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
