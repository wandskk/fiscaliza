import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from '@/lib/http';
import { useAssignInspectors } from './use-assign-inspectors';
import { useConstructionSite } from './use-construction-site';
import { useConstructionSites, constructionSiteKeys } from './use-construction-sites';
import { useInspectors } from './use-inspectors';
import { useSaveConstructionSite } from './use-save-construction-site';

const site = {
  id: '960e0e45-ce80-44cf-81a4-973b4a98200e',
  name: 'Ponte Central',
  contract: 'CT-123',
  address: 'Rua Central, 100',
  closed: false,
  inspectorCount: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const detail = { ...site, inspectorIds: ['inspector-1'] };
const page = { items: [site], total: 1, page: 1, limit: 20 };
const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('construction site hooks', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let client: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
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

  it('caches lists separately by search and loads the matching page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(page));
    const { result, rerender } = renderHook(({ search }) => useConstructionSites({ search }), {
      initialProps: { search: 'Ponte' },
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual(page));
    rerender({ search: 'Viaduto' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(client.getQueryData(constructionSiteKeys.list({ search: 'Ponte' }))).toEqual(page);
  });

  it('loads one detail and available inspectors', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        jsonResponse(
          String(url).includes('/users?')
            ? [{ id: 'inspector-1', name: 'Ana', email: 'ana@example.com' }]
            : detail,
        ),
      ),
    );
    const detailHook = renderHook(() => useConstructionSite(site.id), { wrapper });
    const inspectorsHook = renderHook(() => useInspectors(), { wrapper });

    await waitFor(() => expect(detailHook.result.current.data).toEqual(detail));
    await waitFor(() => expect(inspectorsHook.result.current.data?.[0]?.name).toBe('Ana'));
  });

  it('invalidates lists after creating and lists plus detail after editing', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(site)));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSaveConstructionSite(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        data: { name: site.name, contract: site.contract, address: site.address },
      });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: constructionSiteKeys.lists() });

    invalidate.mockClear();
    await act(async () => {
      await result.current.mutateAsync({ id: site.id, data: { name: 'Nova Ponte' } });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: constructionSiteKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: constructionSiteKeys.detail(site.id) });
  });

  it('invalidates lists and detail when inspectors are replaced', async () => {
    fetchMock.mockResolvedValue(jsonResponse(detail));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAssignInspectors(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: site.id, inspectorIds: ['inspector-1'] });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: constructionSiteKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: constructionSiteKeys.detail(site.id) });
  });
});
