import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from '@/lib/http';
import { CloseConstructionSiteDialog } from './CloseConstructionSiteDialog';
import { InspectorsSelect } from './InspectorsSelect';

const siteId = '960e0e45-ce80-44cf-81a4-973b4a98200e';
const site = {
  id: siteId,
  name: 'Ponte Central',
  contract: 'CT-123',
  address: 'Rua Central, 100',
  closed: true,
  inspectorCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('construction site actions', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    configureHttp({ getToken: () => Promise.resolve('token'), onUnauthorized: () => undefined });
  });

  afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
  });

  it('asks for confirmation before closing a construction site', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(site), { status: 200 }));
    const onOpenChange = vi.fn();
    render(<CloseConstructionSiteDialog siteId={siteId} open onOpenChange={onOpenChange} />, {
      wrapper,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar obra' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ closed: true });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('loads inspectors and submits the selected ids', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(url).includes('/users?')
              ? [
                  { id: 'inspector-1', name: 'Ana', email: 'ana@example.com' },
                  { id: 'inspector-2', name: 'Bruno', email: 'bruno@example.com' },
                ]
              : { ...site, inspectorIds: ['inspector-2'] },
          ),
          { status: 200 },
        ),
      ),
    );
    const onOpenChange = vi.fn();
    render(
      <InspectorsSelect
        siteId={siteId}
        selectedIds={['inspector-1']}
        open
        onOpenChange={onOpenChange}
      />,
      { wrapper },
    );
    expect(await screen.findByLabelText('Bruno')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Ana'));
    fireEvent.click(screen.getByLabelText('Bruno'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar fiscais' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      inspectorIds: ['inspector-2'],
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
