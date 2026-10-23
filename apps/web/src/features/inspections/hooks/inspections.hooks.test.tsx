import { Compliance, InspectionStatus } from '@fiscaliza/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from '@/lib/http';
import { inspectionKeys, useInspection } from './use-inspection';
import { useRemovePhoto } from './use-remove-photo';
import { useSaveInspection } from './use-save-inspection';
import { useSiteInspections } from './use-site-inspections';
import { useSubmitInspection } from './use-submit-inspection';

const inspection = {
  id: 'ec3de278-ffb6-4ccd-a6b4-1cfa40efad8a',
  constructionSiteId: '94e06449-b4b4-4b08-a2f6-a66c04fd7576',
  inspectorId: 'inspector-1',
  notes: 'Observação suficientemente detalhada.',
  compliance: Compliance.COMPLIANT,
  status: InspectionStatus.DRAFT,
  returnReason: null,
  photos: [],
  history: [],
  report: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const page = { items: [], total: 0, page: 1, limit: 20 };
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('inspection hooks', () => {
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

  it('loads a detail and keeps site lists separated by filter', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(
        jsonResponse(String(url).includes('/construction-sites/') ? page : inspection),
      ),
    );
    const detail = renderHook(() => useInspection(inspection.id), { wrapper });
    const list = renderHook(
      () => useSiteInspections(inspection.constructionSiteId, { status: InspectionStatus.DRAFT }),
      { wrapper },
    );

    await waitFor(() => expect(detail.result.current.data).toEqual(inspection));
    await waitFor(() => expect(list.result.current.data).toEqual(page));
    expect(
      client.getQueryData(
        inspectionKeys.siteList(inspection.constructionSiteId, {
          status: InspectionStatus.DRAFT,
        }),
      ),
    ).toEqual(page);
  });

  it('updates the detail cache and invalidates site lists after saving', async () => {
    fetchMock.mockResolvedValue(jsonResponse(inspection));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const set = vi.spyOn(client, 'setQueryData');
    const { result } = renderHook(() => useSaveInspection(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        data: {
          constructionSiteId: inspection.constructionSiteId,
          notes: inspection.notes,
          compliance: inspection.compliance,
        },
      });
    });

    expect(set).toHaveBeenCalledWith(inspectionKeys.detail(inspection.id), inspection);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: inspectionKeys.detail(inspection.id) });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: inspectionKeys.siteLists(inspection.constructionSiteId),
    });
  });

  it('invalidates the detail and site lists after submitting or removing a photo', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(inspection));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const submit = renderHook(() => useSubmitInspection(), { wrapper });
    const remove = renderHook(() => useRemovePhoto(), { wrapper });

    await act(async () => {
      await submit.result.current.mutateAsync(inspection.id);
      await remove.result.current.mutateAsync({
        inspectionId: inspection.id,
        photoId: 'photo-1',
      });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: inspectionKeys.detail(inspection.id) });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: inspectionKeys.siteLists(inspection.constructionSiteId),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: inspectionKeys.siteListsRoot() });
  });
});
