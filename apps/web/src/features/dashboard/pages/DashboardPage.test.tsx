import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/features/auth/test-utils';
import { DashboardPage } from './DashboardPage';

const me = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'gestor@fiscaliza.dev',
  name: 'Gestor',
  role: 'MANAGER',
};

const siteId = '00000000-0000-4000-8000-000000000010';
const inspectionId = '00000000-0000-4000-8000-000000000020';

const dashboard = {
  totals: { SUBMITTED: 1, RETURNED: 2, APPROVED: 3 },
  sites: [
    {
      id: siteId,
      name: 'Escola Central',
      closed: true,
      counts: { SUBMITTED: 1, RETURNED: 2, APPROVED: 3 },
    },
  ],
  awaitingDecision: [
    {
      id: inspectionId,
      constructionSite: { id: siteId, name: 'Escola Central' },
      inspector: { id: '00000000-0000-4000-8000-000000000002', name: 'Carla Fiscal' },
      submittedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
  ],
};

describe('DashboardPage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  function respond(dashboardResponse: () => Promise<Response>) {
    fetchMock.mockImplementation((url) =>
      String(url).endsWith('/me') ? Promise.resolve(Response.json(me)) : dashboardResponse(),
    );
  }

  beforeEach(() => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('shows totals, sites table and awaiting list with links', async () => {
    respond(() => Promise.resolve(Response.json(dashboard)));
    renderWithProviders(<DashboardPage />);

    const totals = await screen.findByRole('list', { name: 'Totais por status' });
    expect(within(totals).getAllByRole('listitem')).toHaveLength(3);
    const siteLinks = screen.getAllByRole('link', { name: 'Escola Central' });
    expect(siteLinks[0]).toHaveAttribute('href', `/construction-sites/${siteId}`);
    expect(siteLinks[1]).toHaveAttribute('href', `/inspections/${inspectionId}`);
    expect(screen.getByText('Encerrada')).toBeInTheDocument();
    expect(screen.getByText(/enviada há 2 dias/)).toBeInTheDocument();
  });

  it('shows the skeleton while loading', async () => {
    respond(() => new Promise<Response>(() => undefined));
    renderWithProviders(<DashboardPage />);
    expect(screen.getByRole('status', { name: 'Carregando painel' })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it('shows the empty state with no sites and no inspections', async () => {
    respond(() =>
      Promise.resolve(
        Response.json({
          totals: { SUBMITTED: 0, RETURNED: 0, APPROVED: 0 },
          sites: [],
          awaitingDecision: [],
        }),
      ),
    );
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('Nada por aqui ainda')).toBeInTheDocument();
  });

  it('shows a retryable error', async () => {
    respond(() =>
      Promise.resolve(Response.json({ code: 'ERROR', message: 'Falha' }, { status: 500 })),
    );
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o painel.',
    );

    respond(() => Promise.resolve(Response.json(dashboard)));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('list', { name: 'Totais por status' })).toBeInTheDocument();
  });
});
