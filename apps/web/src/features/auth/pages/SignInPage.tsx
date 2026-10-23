import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Skeleton } from '@/design-system';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useSession } from '@/features/auth/hooks/use-session';
import { AuthError, type Credentials } from '@/features/auth/utils/auth-backend';

export function SignInPage() {
  const { status, mode, signIn } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Skeleton className="h-64 w-full max-w-sm" />
      </main>
    );
  }
  // Also covers the moment right after a successful sign in: "/" sends each role to its own home
  if (status === 'authenticated') return <Navigate to="/" replace />;

  async function handleSubmit(credentials: Credentials) {
    setSubmitError(null);
    try {
      await signIn(credentials);
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? error.message
          : 'Não foi possível entrar agora. Tente novamente.',
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <Card className="flex w-full max-w-sm flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text">Fiscaliza</h1>
          <p className="text-sm text-muted">Entre para acessar as obras e vistorias.</p>
        </div>
        <LoginForm mode={mode} onSubmit={handleSubmit} submitError={submitError} />
      </Card>
    </main>
  );
}
