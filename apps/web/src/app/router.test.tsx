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
    it.each(['/', '/obras', '/painel'])('redirects %s to /sign-in', async (route) => {
      renderApp(route);

      await expectPath('/sign-in');
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('inspector', () => {
    beforeEach(() => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    });

    it('lands on Obras and sees only that menu item', async () => {
      renderApp('/');

      await expectPath('/obras');
      const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
      expect(nav).toHaveTextContent('Obras');
      expect(nav).not.toHaveTextContent('Painel');
      expect(screen.getByText('Fiscal de Teste')).toBeInTheDocument();
    });

    it('is sent back to its home when opening the manager dashboard', async () => {
      renderApp('/painel');

      await expectPath('/obras');
      expect(screen.getByRole('heading', { name: 'Obras' })).toBeInTheDocument();
    });

    it('is redirected away from /sign-in', async () => {
      renderApp('/sign-in');

      await expectPath('/obras');
    });
  });

  describe('manager', () => {
    beforeEach(() => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    });

    it('lands on Painel and sees Obras and Painel in the menu', async () => {
      renderApp('/');

      await expectPath('/painel');
      const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
      expect(nav).toHaveTextContent('Obras');
      expect(nav).toHaveTextContent('Painel');
      expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    });

    it('can open Obras from the menu', async () => {
      const user = userEvent.setup();
      renderApp('/painel');

      await user.click(await screen.findByRole('link', { name: 'Obras' }));

      await expectPath('/obras');
    });
  });

  describe('topbar', () => {
    it('toggles the theme and signs out back to /sign-in', async () => {
      sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
      const user = userEvent.setup();
      renderApp('/obras');

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
      renderApp('/obras');

      await expectPath('/sign-in');
      expect(sessionStorage.getItem('fiscaliza-local-token')).toBeNull();
    });
  });

  describe('/design-system', () => {
    it('stays reachable without session in dev', async () => {
      renderApp('/design-system');

      expect(await screen.findByText(/design system/i, { selector: 'h1' })).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
