import type { Role } from '@fiscaliza/shared';
import { Navigate, Outlet } from 'react-router-dom';
import { Button, Skeleton } from '@/design-system';
import { useMe } from '@/features/auth/hooks/use-me';
import { useSession } from '@/features/auth/hooks/use-session';
import { homeForRole } from '@/features/auth/utils/role-navigation';

interface ProtectedRouteProps {
  // Omit to accept any signed-in role
  allowedRoles?: readonly Role[];
}

function FullScreenSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="flex min-h-screen flex-col gap-4 p-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// The front only hides things: the API is what really enforces the role (constitution, section 7)
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { status, signOut } = useSession();
  const me = useMe();

  if (status === 'loading') return <FullScreenSkeleton />;
  if (status === 'unauthenticated') return <Navigate to="/sign-in" replace />;
  if (me.isPending) return <FullScreenSkeleton />;

  if (me.isError) {
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <p className="text-base font-medium text-text">Não foi possível carregar seu perfil.</p>
        <p className="text-sm text-muted">{me.error.message}</p>
        <div className="flex gap-2">
          <Button onClick={() => void me.refetch()}>Tentar de novo</Button>
          <Button variant="secondary" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(me.data.role)) {
    return <Navigate to={homeForRole(me.data.role)} replace />;
  }
  return <Outlet />;
}
