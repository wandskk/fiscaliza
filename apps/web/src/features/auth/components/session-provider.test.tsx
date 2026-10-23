import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorCode } from '@fiscaliza/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '@/features/auth/components/session-provider';
import { useMe } from '@/features/auth/hooks/use-me';
import { useSession } from '@/features/auth/hooks/use-session';
import { createLocalAuthBackend } from '@/features/auth/utils/local-auth-backend';

function Probe() {
  const { status, signIn, signOut } = useSession();
  const me = useMe();
  return (
    <div>
      <p>status: {status}</p>
      <p>me: {me.data?.name ?? (me.isError ? 'error' : 'none')}</p>
      <button onClick={() => void signIn({ mode: 'local', localUser: 'local-manager' })}>
        entrar
      </button>
      <button onClick={() => void signOut()}>sair</button>
    </div>
  );
}

function renderProbe() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider backend={createLocalAuthBackend()}>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

const manager = {
  id: '00000000-0000-4000-8000-000000000003',
  email: 'gestor@fiscaliza.dev',
  name: 'Gestor de Teste',
  role: 'MANAGER',
};

describe('SessionProvider (local mode)', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts unauthenticated, signs in with a test user and loads /me with its token', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(manager)));
    const user = userEvent.setup();
    renderProbe();

    expect(await screen.findByText('status: unauthenticated')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'entrar' }));

    expect(await screen.findByText('me: Gestor de Teste')).toBeInTheDocument();
    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer local-manager');
  });

  it('restores the session after a reload', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(manager)));
    renderProbe();

    expect(await screen.findByText('status: authenticated')).toBeInTheDocument();
  });

  it('signs out, forgets the token and clears the cached user', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(manager)));
    const user = userEvent.setup();
    renderProbe();
    await screen.findByText('me: Gestor de Teste');

    await user.click(screen.getByRole('button', { name: 'sair' }));

    expect(await screen.findByText('status: unauthenticated')).toBeInTheDocument();
    expect(screen.getByText('me: none')).toBeInTheDocument();
    expect(sessionStorage.getItem('fiscaliza-local-token')).toBeNull();
  });

  it('leaves the session when the API answers 401', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        Response.json(
          { code: ErrorCode.UNAUTHORIZED, message: 'x', details: [], correlationId: 'c' },
          { status: 401 },
        ),
      ),
    );
    renderProbe();

    await waitFor(() => {
      expect(screen.getByText('status: unauthenticated')).toBeInTheDocument();
    });
    expect(sessionStorage.getItem('fiscaliza-local-token')).toBeNull();
  });
});
