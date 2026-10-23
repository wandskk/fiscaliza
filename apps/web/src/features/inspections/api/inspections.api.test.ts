import { Compliance, InspectionStatus } from '@fiscaliza/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttp } from '@/lib/http';
import {
  confirmInspectionPhoto,
  createInspection,
  decideInspection,
  getInspection,
  listSiteInspections,
  removeInspectionPhoto,
  requestInspectionPhotoUpload,
  submitInspection,
  updateInspection,
} from './inspections.api';

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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('inspections API', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    configureHttp({ getToken: () => Promise.resolve('token'), onUnauthorized: () => undefined });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists site inspections with status and pagination filters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0, page: 2, limit: 10 }));

    await listSiteInspections(inspection.constructionSiteId, {
      status: InspectionStatus.SUBMITTED,
      page: 2,
      limit: 10,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe(
      `/api/v1/construction-sites/${inspection.constructionSiteId}/inspections`,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: InspectionStatus.SUBMITTED,
      page: '2',
      limit: '10',
    });
  });

  it('gets, creates, updates and submits an inspection through the documented routes', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(inspection)));
    const signal = new AbortController().signal;

    await getInspection(inspection.id, signal);
    await createInspection({
      constructionSiteId: inspection.constructionSiteId,
      notes: inspection.notes,
      compliance: inspection.compliance,
    });
    await updateInspection(inspection.id, { notes: 'Notas atualizadas com detalhes suficientes.' });
    await submitInspection(inspection.id);

    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      new RegExp(`/inspections/${inspection.id}$`),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(signal);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PATCH' });
    expect(String(fetchMock.mock.calls[3]?.[0])).toMatch(
      new RegExp(`/inspections/${inspection.id}/submit$`),
    );
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('posts the decision and validates the returned detail', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(inspection));

    const result = await decideInspection(inspection.id, {
      decision: 'RETURN',
      reason: 'Faltam fotos da fachada.',
    });

    expect(result).toEqual(inspection);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      new RegExp(`/inspections/${inspection.id}/decision$`),
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      decision: 'RETURN',
      reason: 'Faltam fotos da fachada.',
    });
  });

  it('requests an upload, confirms it and removes the photo', async () => {
    const upload = {
      url: 'http://localhost:4566/upload',
      key: `inspections/${inspection.id}/photo.jpeg`,
      expiresAt: '2026-01-01T00:05:00.000Z',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(upload));
    fetchMock.mockResolvedValueOnce(jsonResponse(inspection, 201));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await requestInspectionPhotoUpload(inspection.id, {
      contentType: 'image/jpeg',
      size: 100,
    });
    await confirmInspectionPhoto(inspection.id, { key: upload.key });
    await expect(removeInspectionPhoto(inspection.id, 'photo-1')).resolves.toBeUndefined();

    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/photos\/upload-url$/);
    expect(String(fetchMock.mock.calls[1]?.[0])).toMatch(/\/photos$/);
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe('DELETE');
  });
});
