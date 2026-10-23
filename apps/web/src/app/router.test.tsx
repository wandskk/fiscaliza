import { ErrorCode } from '@fiscaliza/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/router';
import { renderWithProviders } from '@/features/auth/test-utils';

const USERS = {
  'local-inspector': {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'fiscal@fiscaliza.dev',
    name: 'Fiscal de Teste',
    role: 'INSPECTOR',
  },
  'local-manager': {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'gestor@fiscaliza.dev',
    name: 'Gestor de Teste',
    role: 'MANAGER',
  },
} as const;

function LocationProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderApp(route: string) {
  return renderWithProviders(
    <>
      <AppRoutes />
      <LocationProbe />
    </>,
    { route },
  );
}

async function expectPath(path: string) {
  expect(await screen.findByText(path, { selector: '[data-testid="path"]' })).toBeInTheDocument();
}

describe('AppRoutes', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.clear();
    fetchMock.mockReset();
    // Mimics the API: /me answers according to the Bearer test token
    fetchMock.mockImplementation((_url, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const token = headers.Authorization?.replace('Bearer ', '') as keyof typeof USERS;
      const user = USERS[token];
      return Promise.resolve(
        user
          ? Response.json(user)
          : Response.json(
              { code: ErrorCode.UNAUTHORIZED, message: 'x', details: [], correlationId: 'c' },
              { status: 401 },
            ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('without session', () => {
    it.each(['/', '/construction-sites', '/dashboard'])(
      'redirects %s to /sign-in',
      async (route) => {
        renderApp(route);

        await expectPath('/sign-in');
        expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );
  });

  describe('inspector', () => {
    beforeEach(() => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    });

    it('lands on Obras and sees only that menu item', async () => {
      renderApp('/');

      await expectPath('/construction-sites');
      const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
      expect(nav).toHaveTextContent('Obras');
      expect(nav).not.toHaveTextContent('Painel');
      expect(screen.getByText('Fiscal de Teste')).toBeInTheDocument();
    });

    it('is sent back to its home when opening the manager dashboard', async () => {
      renderApp('/dashboard');

      await expectPath('/construction-sites');
      expect(screen.getByRole('heading', { name: 'Obras' })).toBeInTheDocument();
    });

    it('is redirected away from /sign-in', async () => {
      renderApp('/sign-in');

      await expectPath('/construction-sites');
    });
  });

  describe('manager', () => {
    beforeEach(() => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    });

    it('lands on Painel and sees Obras and Painel in the menu', async () => {
      renderApp('/');

      await expectPath('/dashboard');
      const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
      expect(nav).toHaveTextContent('Obras');
      expect(nav).toHaveTextContent('Painel');
      expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    });

    it('is sent back to its home when opening the new inspection page', async () => {
      renderApp('/inspections/new?site=94e06449-b4b4-4b08-a2f6-a66c04fd7576');

      await expectPath('/dashboard');
    });

    it('can open Obras from the menu', async () => {
      const user = userEvent.setup();
      renderApp('/dashboard');

      await user.click(await screen.findByRole('link', { name: 'Obras' }));

      await expectPath('/construction-sites');
    });
  });

  describe('topbar', () => {
    it('toggles the theme and signs out back to /sign-in', async () => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
      const user = userEvent.setup();
      renderApp('/construction-sites');

      await user.click(await screen.findByRole('button', { name: /Ativar tema/ }));
      expect(document.documentElement.dataset.theme).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Sair' }));

      await expectPath('/sign-in');
      expect(sessionStorage.getItem('fiscaliza-local-token')).toBeNull();
    });
  });

  describe('invalid session', () => {
    it('goes back to /sign-in when the API rejects the stored token', async () => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-inspector-2');
      renderApp('/construction-sites');

      await expectPath('/sign-in');
      expect(sessionStorage.getItem('fiscaliza-local-token')).toBeNull();
    });
  });

  describe('/design-system', () => {
    it('stays reachable without session in dev', async () => {
      renderApp('/design-system');

      // The showcase is a lazy chunk; under a loaded machine its import takes longer than 1 s
      expect(
        await screen.findByText(/design system/i, { selector: 'h1' }, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
