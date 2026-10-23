import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/app/router';
import { renderWithProviders } from '@/features/auth/test-utils';

const id = '960e0e45-ce80-44cf-81a4-973b4a98200e';
const detail = {
  id,
  name: 'Ponte Central',
  contract: 'CT-123',
  address: 'Rua Central, 100',
  closed: false,
  inspectorCount: 1,
  inspectorIds: ['inspector-1'],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const inspectionsPage = {
  items: [
    {
      id: '3f0d3c1e-6d7e-4f55-9a4b-0a1b2c3d4e5f',
      status: 'SUBMITTED',
      compliance: 'COMPLIANT',
      inspectorId: 'user-1',
      createdAt: '2026-10-20T12:00:00.000Z',
      updatedAt: '2026-10-21T12:00:00.000Z',
      photoCount: 2,
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
};

describe('ConstructionSiteDetailPage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((url, init) => {
      const path = String(url);
      if (path.endsWith('/me')) {
        const token = ((init?.headers ?? {}) as Record<string, string>).Authorization;
        return Promise.resolve(
          Response.json({
            id: 'user-1',
            email: 'user@example.com',
            name: 'Usuário',
            role: token === 'Bearer local-manager' ? 'MANAGER' : 'INSPECTOR',
          }),
        );
      }
      if (path.includes('/inspections')) {
        return Promise.resolve(Response.json(inspectionsPage));
      }
      if (path.includes('/users?')) {
        return Promise.resolve(
          Response.json([{ id: 'inspector-1', name: 'Ana', email: 'ana@example.com' }]),
        );
      }
      return Promise.resolve(Response.json(detail));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('shows the site, inspector and manager actions', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    renderWithProviders(<AppRoutes />, { route: `/construction-sites/${id}` });

    expect(await screen.findByRole('heading', { name: 'Ponte Central' })).toBeInTheDocument();
    expect(screen.getByText('CT-123')).toBeInTheDocument();
    expect(screen.getByText('Rua Central, 100')).toBeInTheDocument();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar obra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Definir fiscais' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar obra' })).toBeInTheDocument();
  });

  it('hides manager actions and does not request the inspector directory for an inspector', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    renderWithProviders(<AppRoutes />, { route: `/construction-sites/${id}` });

    expect(await screen.findByRole('heading', { name: 'Ponte Central' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar obra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Definir fiscais' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar obra' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/users?'))).toBe(false);
  });

  it('shows loading and retries a failed detail request', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    let failed = true;
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/me')) {
        return Promise.resolve(
          Response.json({
            id: 'user-1',
            email: 'user@example.com',
            name: 'Fiscal',
            role: 'INSPECTOR',
          }),
        );
      }
      return Promise.resolve(
        failed
          ? Response.json(
              { code: 'INTERNAL_ERROR', message: 'Falha', details: [], correlationId: 'c' },
              { status: 500 },
            )
          : Response.json(detail),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: `/construction-sites/${id}` });

    expect(await screen.findByRole('status', { name: 'Carregando obra' })).toBeInTheDocument();
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' });
    failed = false;
    await user.click(retry);
    expect(await screen.findByRole('heading', { name: 'Ponte Central' })).toBeInTheDocument();
  });

  it('lists the inspections and offers a new one only to the assigned inspector', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    fetchMock.mockImplementation((url) => {
      const path = String(url);
      if (path.endsWith('/me')) {
        return Promise.resolve(
          Response.json({
            id: 'inspector-1',
            email: 'ana@example.com',
            name: 'Ana',
            role: 'INSPECTOR',
          }),
        );
      }
      if (path.includes('/inspections')) return Promise.resolve(Response.json(inspectionsPage));
      return Promise.resolve(Response.json(detail));
    });
    renderWithProviders(<AppRoutes />, { route: `/construction-sites/${id}` });

    expect(await screen.findByRole('link', { name: /Ver vistoria/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova vistoria' })).toHaveAttribute(
      'href',
      `/inspections/new?site=${id}`,
    );
  });

  it('hides the new inspection button from a manager and from an unassigned inspector', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    renderWithProviders(<AppRoutes />, { route: `/construction-sites/${id}` });

    expect(await screen.findByRole('link', { name: /Ver vistoria/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nova vistoria' })).not.toBeInTheDocument();
  });

  it('hides the new inspection button on a closed site', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-inspector');
    fetchMock.mockImplementation((url) => {
      const path = String(url);
      if (path.endsWith('/me')) {
        return Promise.resolve(
          Response.json({
            id: 'inspector-1',
            email: 'ana@example.com',
            name: 'Ana',
            role: 'INSPECTOR',
          }),
        );
      }
      if (path.includes('/inspections')) return Promise.resolve(Response.json(inspectionsPage));
      return Promise.resolve(Response.json({ ...detail, closed: true }));
    });
    renderWithProviders(<AppRoutes />, { route: `/construction-sites/${id}` });

    expect(await screen.findByRole('link', { name: /Ver vistoria/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nova vistoria' })).not.toBeInTheDocument();
  });
});
