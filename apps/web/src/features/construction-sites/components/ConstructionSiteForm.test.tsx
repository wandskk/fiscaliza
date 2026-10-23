import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from '@/lib/http';
import { ConstructionSiteForm } from './ConstructionSiteForm';

const site = {
  id: '960e0e45-ce80-44cf-81a4-973b4a98200e',
  name: 'Ponte Central',
  contract: 'CT-123',
  address: 'Rua Central, 100',
  closed: false,
  inspectorCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('ConstructionSiteForm', () => {
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

  it('validates required fields before creating', async () => {
    render(<ConstructionSiteForm open onOpenChange={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Criar obra' }));
    expect(await screen.findAllByRole('alert')).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a construction site and closes the dialog', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(site), { status: 201 }));
    const onOpenChange = vi.fn();
    render(<ConstructionSiteForm open onOpenChange={onOpenChange} />, { wrapper });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: site.name } });
    fireEvent.change(screen.getByLabelText('Contrato'), { target: { value: site.contract } });
    fireEvent.change(screen.getByLabelText('Endereço'), { target: { value: site.address } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar obra' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      name: site.name,
      contract: site.contract,
      address: site.address,
    });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('edits a construction site and shows DUPLICATE_CONTRACT in the form', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'DUPLICATE_CONTRACT',
          message: 'Contrato já cadastrado.',
          details: [],
          correlationId: 'correlation-1',
        }),
        { status: 409 },
      ),
    );
    render(<ConstructionSiteForm open onOpenChange={vi.fn()} site={site} />, { wrapper });
    expect(screen.getByDisplayValue(site.name)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Contrato'), { target: { value: 'CT-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Contrato já cadastrado.')).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH');
  });
});
