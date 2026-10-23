import { Role } from '@fiscaliza/shared';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { useMe } from '@/features/auth/hooks/use-me';
const SignInPage = lazy(() =>
  import('@/features/auth/pages/SignInPage').then((m) => ({ default: m.SignInPage })),
);
import { homeForRole } from '@/features/auth/utils/role-navigation';
const ConstructionSitesPage = lazy(() =>
  import('@/features/construction-sites/pages/ConstructionSitesPage').then((m) => ({
    default: m.ConstructionSitesPage,
  })),
);
const ConstructionSiteDetailPage = lazy(() =>
  import('@/features/construction-sites/pages/ConstructionSiteDetailPage').then((m) => ({
    default: m.ConstructionSiteDetailPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const InspectionDetailPage = lazy(() =>
  import('@/features/inspections/pages/InspectionDetailPage').then((m) => ({
    default: m.InspectionDetailPage,
  })),
);
const NewInspectionPage = lazy(() =>
  import('@/features/inspections/pages/NewInspectionPage').then((m) => ({
    default: m.NewInspectionPage,
  })),
);

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
    <Suspense
      fallback={
        <div role="status" className="p-8 text-muted">
          Carregando...
        </div>
      }
    >
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        {DesignSystemPage && <Route path="/design-system" element={<DesignSystemPage />} />}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<RoleHomeRedirect />} />
            <Route path="/construction-sites" element={<ConstructionSitesPage />} />
            <Route path="/construction-sites/:id" element={<ConstructionSiteDetailPage />} />
            <Route element={<ProtectedRoute allowedRoles={[Role.INSPECTOR]} />}>
              <Route path="/inspections/new" element={<NewInspectionPage />} />
            </Route>
            <Route path="/inspections/:id" element={<InspectionDetailPage />} />
            <Route element={<ProtectedRoute allowedRoles={[Role.MANAGER]} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
