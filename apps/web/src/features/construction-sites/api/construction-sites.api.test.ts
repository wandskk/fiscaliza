import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from '@/lib/http';
import {
  assignInspectors,
  createConstructionSite,
  getConstructionSite,
  listConstructionSites,
  listInspectors,
  updateConstructionSite,
} from './construction-sites.api';

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
const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('construction sites API', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    configureHttp({ getToken: () => Promise.resolve('token'), onUnauthorized: () => undefined });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists with search, page, limit and closed filters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [site], total: 1, page: 2, limit: 10 }));

    const result = await listConstructionSites({
      search: 'ponte & rua',
      page: 2,
      limit: 10,
      closed: false,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe('/api/v1/construction-sites');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: 'ponte & rua',
      page: '2',
      limit: '10',
      closed: 'false',
    });
    expect(result.items).toEqual([site]);
  });

  it('gets a detail and forwards an AbortSignal', async () => {
    fetchMock.mockResolvedValue(jsonResponse(detail));
    const signal = new AbortController().signal;

    await expect(getConstructionSite(site.id, signal)).resolves.toEqual(detail);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      new RegExp(`/construction-sites/${site.id}$`),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal);
  });

  it('creates and updates a construction site with the correct methods and bodies', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(site)));
    await createConstructionSite({
      name: site.name,
      contract: site.contract,
      address: site.address,
    });
    await updateConstructionSite(site.id, { name: 'Nova Ponte' });

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ name: site.name, contract: site.contract, address: site.address }),
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nova Ponte' }),
    });
  });

  it('replaces inspectors and lists available inspectors', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(detail));
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 'inspector-1', name: 'Ana', email: 'ana@example.com' }]),
    );

    await expect(assignInspectors(site.id, { inspectorIds: ['inspector-1'] })).resolves.toEqual(
      detail,
    );
    await expect(listInspectors()).resolves.toHaveLength(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      new RegExp(`/construction-sites/${site.id}/inspectors$`),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT');
    expect(String(fetchMock.mock.calls[1]?.[0])).toMatch(/\/users\?role=INSPECTOR$/);
  });
});
