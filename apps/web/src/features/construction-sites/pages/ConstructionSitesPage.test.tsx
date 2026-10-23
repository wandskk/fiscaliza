import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/features/auth/test-utils';
import { ConstructionSitesPage } from './ConstructionSitesPage';

vi.mock('@/features/construction-sites/components/ConstructionSiteForm', () => ({
  ConstructionSiteForm: ({ open }: { open: boolean }) => open && <div>Formulário de obra</div>,
}));

const site = {
  id: '00000000-0000-4000-8000-000000000010',
  name: 'Escola Central',
  contract: 'ABC-123',
  address: 'Rua Central, 100',
  closed: false,
  inspectorCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const me = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'gestor@fiscaliza.dev',
  name: 'Gestor',
  role: 'MANAGER',
};

describe('ConstructionSitesPage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    fetchMock.mockReset();
    fetchMock.mockImplementation((url) => {
      const path = String(url);
      if (path.endsWith('/me')) return Promise.resolve(Response.json(me));
      return Promise.resolve(Response.json({ items: [site], total: 1, page: 1, limit: 10 }));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('shows cards and opens the create form for managers', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConstructionSitesPage />);

    expect(await screen.findByRole('link', { name: /Escola Central/ })).toHaveAttribute(
      'href',
      `/construction-sites/${site.id}`,
    );
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
    expect(screen.getByText('2 fiscais')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Nova obra' }));
    expect(screen.getByText('Formulário de obra')).toBeInTheDocument();
  });

  it('debounces search and resets pagination', async () => {
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/me')) return Promise.resolve(Response.json(me));
      return Promise.resolve(Response.json({ items: [site], total: 22, page: 1, limit: 10 }));
    });
    renderWithProviders(<ConstructionSitesPage />);
    await screen.findByText('Escola Central');
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything()),
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar obras' }), {
      target: { value: 'ponte' },
    });
    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringMatching(/search=ponte.*page=1/),
          expect.anything(),
        ),
      { timeout: 1500 },
    );
  });

  it('shows loading, empty and retryable error states', async () => {
    let resolveList: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/me')) return Promise.resolve(Response.json(me));
      return new Promise<Response>((resolve) => {
        resolveList = resolve;
      });
    });
    const { unmount } = renderWithProviders(<ConstructionSitesPage />);
    expect(screen.getByRole('status', { name: 'Carregando obras' })).toBeInTheDocument();
    await waitFor(() => expect(resolveList).toBeDefined());
    resolveList?.(Response.json({ items: [], total: 0, page: 1, limit: 10 }));
    expect(await screen.findByText('Nenhuma obra encontrada')).toBeInTheDocument();
    unmount();

    fetchMock.mockImplementation((url) =>
      String(url).endsWith('/me')
        ? Promise.resolve(Response.json(me))
        : Promise.resolve(Response.json({ code: 'ERROR', message: 'Falha' }, { status: 500 })),
    );
    renderWithProviders(<ConstructionSitesPage />);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    fetchMock.mockImplementation((url) =>
      String(url).endsWith('/me')
        ? Promise.resolve(Response.json(me))
        : Promise.resolve(Response.json({ items: [site], total: 1, page: 1, limit: 10 })),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Escola Central')).toBeInTheDocument();
  });
});
