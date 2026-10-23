import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/app/layout/Sidebar';
import { Topbar } from '@/app/layout/Topbar';
import { useMe } from '@/features/auth/hooks/use-me';
import { useSession } from '@/features/auth/hooks/use-session';

// Rendered inside ProtectedRoute, so /me is already loaded
export function AppShell() {
  const { data: me } = useMe();
  const { signOut } = useSession();

  if (!me) return null;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <Topbar userName={me.name} onSignOut={() => void signOut()} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar role={me.role} />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
