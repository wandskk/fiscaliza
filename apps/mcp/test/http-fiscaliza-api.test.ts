import { describe, expect, it, vi } from 'vitest';
import { FiscalizaApiError } from '../src/application/ports/fiscaliza-api.js';
import { HttpFiscalizaApi } from '../src/infrastructure/http-fiscaliza-api.js';

const SITE_ID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const BASE = 'http://localhost:3000/api/v1';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorBody(code: string, message = 'texto da API') {
  return { code, message, details: [], correlationId: 'abc' };
}

function apiWith(fetchFn: typeof fetch) {
  return new HttpFiscalizaApi(`${BASE}/`, 'local-manager', fetchFn);
}

describe('HttpFiscalizaApi', () => {
  it('sends the Bearer token and the search as query string', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      json({ items: [], total: 0, page: 1, limit: 20 }),
    );

    await apiWith(fetchFn).listConstructionSites({ search: 'centro', page: 2 });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(String(url)).toBe(`${BASE}/construction-sites?search=centro&page=2`);
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer local-manager');
  });

  it('asks the inspections of a site by status', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      json({ items: [], total: 0, page: 1, limit: 20 }),
    );

    await apiWith(fetchFn).siteInspections(SITE_ID, 'SUBMITTED');

    expect(String(fetchFn.mock.calls[0]?.[0])).toBe(
      `${BASE}/construction-sites/${SITE_ID}/inspections?status=SUBMITTED`,
    );
  });

  it('validates the response with the shared schema', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json({ totals: 'nada' }));

    await expect(apiWith(fetchFn).dashboard()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('turns the standard error into a FiscalizaApiError with the Portuguese message', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json(errorBody('INSPECTION_NOT_FOUND'), 404));

    const error = await apiWith(fetchFn)
      .inspection(SITE_ID)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(FiscalizaApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'INSPECTION_NOT_FOUND',
      message: 'Vistoria não encontrada.',
    });
  });

  it('explains the token on 401', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => json(errorBody('UNAUTHORIZED'), 401));

    await expect(apiWith(fetchFn).dashboard()).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('FISCALIZA_API_TOKEN'),
    });
  });

  it('handles an error without the standard body', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('Bad Gateway', { status: 502 }));

    await expect(apiWith(fetchFn).dashboard()).rejects.toMatchObject({
      status: 502,
      message: 'A API respondeu com erro 502.',
    });
  });

  it('reports when the API is unreachable', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(apiWith(fetchFn).dashboard()).rejects.toMatchObject({
      status: undefined,
      message: expect.stringContaining('Não foi possível conectar'),
    });
  });
});
