import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  SessionContext,
  type SessionContextValue,
  type SessionStatus,
} from '@/features/auth/hooks/use-session';
import type { AuthBackend, Credentials } from '@/features/auth/utils/auth-backend';
import { createAuthBackend } from '@/features/auth/utils/create-auth-backend';
import { env } from '@/lib/env';
import { configureHttp } from '@/lib/http';

interface SessionProviderProps {
  children: ReactNode;
  // Injected by tests; the app uses the backend chosen by VITE_AUTH_MODE
  backend?: AuthBackend;
}

export function SessionProvider({ children, backend: injected }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [backend] = useState<AuthBackend>(() => injected ?? createAuthBackend());
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    backend
      .restore()
      .then((valid) => {
        if (!cancelled) setStatus(valid ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const signOut = useCallback(async () => {
    try {
      await backend.signOut();
    } finally {
      queryClient.clear();
      setStatus('unauthenticated');
    }
  }, [backend, queryClient]);

  const signIn = useCallback(
    async (credentials: Credentials) => {
      await backend.signIn(credentials);
      queryClient.clear();
      setStatus('authenticated');
    },
    [backend, queryClient],
  );

  // The HTTP client reads the token from the backend and leaves the session on a 401
  useEffect(() => {
    configureHttp({
      getToken: () => backend.getToken(),
      onUnauthorized: () => void signOut(),
    });
  }, [backend, signOut]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, mode: env.authMode, signIn, signOut }),
    [status, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
