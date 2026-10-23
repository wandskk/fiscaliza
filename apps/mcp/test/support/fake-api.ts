import type { Dashboard, InspectionDetail, InspectionPageResponse } from '@fiscaliza/shared';
import { FiscalizaApiError, type FiscalizaApi } from '../../src/application/ports/fiscaliza-api.js';

export const SITE_A = '11111111-1111-4111-8111-111111111111';
export const SITE_B = '22222222-2222-4222-8222-222222222222';
export const INSPECTION_1 = '33333333-3333-4333-8333-333333333333';
export const INSPECTION_2 = '44444444-4444-4444-8444-444444444444';
export const MISSING = '99999999-9999-4999-8999-999999999999';
const INSPECTOR = '55555555-5555-4555-8555-555555555555';

export const PHOTO_URL = 'https://bucket.example/foto.jpg?X-Amz-Signature=segredo';

export const dashboard: Dashboard = {
  totals: { SUBMITTED: 2, RETURNED: 1, APPROVED: 4 },
  sites: [
    {
      id: SITE_A,
      name: 'Edifício Aurora',
      closed: false,
      counts: { SUBMITTED: 2, RETURNED: 1, APPROVED: 3 },
    },
    // SITE_B is not here on purpose: its counts must default to zero
  ],
  awaitingDecision: [
    {
      id: INSPECTION_1,
      constructionSite: { id: SITE_A, name: 'Edifício Aurora' },
      inspector: { id: INSPECTOR, name: 'Carla Fiscal' },
      submittedAt: '2026-10-23T15:00:00.000Z',
    },
    {
      id: INSPECTION_2,
      constructionSite: { id: SITE_A, name: 'Edifício Aurora' },
      inspector: { id: INSPECTOR, name: 'Carla Fiscal' },
      submittedAt: '2026-10-23T16:00:00.000Z',
    },
  ],
};

export const sites = [
  {
    id: SITE_A,
    name: 'Edifício Aurora',
    contract: 'CT-001',
    address: 'Rua das Flores, 100',
    closed: false,
    inspectorCount: 2,
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: SITE_B,
    name: 'Ponte Norte',
    contract: 'CT-002',
    address: 'Av. do Rio, 5',
    closed: true,
    inspectorCount: 0,
    createdAt: '2026-09-02T12:00:00.000Z',
  },
];

export function detail(overrides: Partial<InspectionDetail> = {}): InspectionDetail {
  return {
    id: INSPECTION_1,
    constructionSiteId: SITE_A,
    notes: 'Armadura exposta na laje do 3º andar, sem cobrimento mínimo.',
    compliance: 'NON_COMPLIANT',
    inspectorId: INSPECTOR,
    status: 'SUBMITTED',
    returnReason: null,
    photos: [
      { id: 'p1', key: 'k1', contentType: 'image/jpeg', size: 1000, url: PHOTO_URL },
      { id: 'p2', key: 'k2', contentType: 'image/jpeg', size: 1000, url: PHOTO_URL },
    ],
    history: [
      {
        from: null,
        to: 'DRAFT',
        user: { id: INSPECTOR, name: 'Carla Fiscal' },
        at: '2026-10-23T14:00:00.000Z',
        reason: null,
      },
      {
        from: 'DRAFT',
        to: 'SUBMITTED',
        user: { id: INSPECTOR, name: 'Carla Fiscal' },
        at: '2026-10-23T15:00:00.000Z',
        reason: null,
      },
    ],
    report: {
      summary: 'Armadura exposta indica falha de cobrimento e risco de corrosão na laje.',
      nonConformities: [
        { item: 'Cobrimento', description: 'Armadura sem cobrimento mínimo.', severity: 'HIGH' },
      ],
      severity: 'HIGH',
      model: 'stub',
      generatedAt: '2026-10-23T15:05:00.000Z',
    },
    createdAt: '2026-10-23T14:00:00.000Z',
    updatedAt: '2026-10-23T15:05:00.000Z',
    ...overrides,
  };
}

export class FakeFiscalizaApi implements FiscalizaApi {
  readonly calls: string[] = [];
  failWith: FiscalizaApiError | undefined;
  inspectionDetail: InspectionDetail = detail();

  listConstructionSites(query: { search?: string }) {
    this.calls.push(`listConstructionSites:${query.search ?? ''}`);
    this.throwIfFailing();
    const term = query.search?.toLowerCase();
    const items = sites.filter(
      (site) => term === undefined || site.name.toLowerCase().includes(term),
    );
    return Promise.resolve({ items, total: items.length, page: 1, limit: 100 });
  }

  dashboard() {
    this.calls.push('dashboard');
    this.throwIfFailing();
    return Promise.resolve(dashboard);
  }

  siteInspections(constructionSiteId: string, status: string) {
    this.calls.push(`siteInspections:${constructionSiteId}:${status}`);
    this.throwIfFailing();
    const items: InspectionPageResponse['items'] =
      constructionSiteId === SITE_A
        ? [
            {
              id: INSPECTION_1,
              status: 'SUBMITTED',
              compliance: 'NON_COMPLIANT',
              inspectorId: INSPECTOR,
              createdAt: '2026-10-23T14:00:00.000Z',
              updatedAt: '2026-10-23T15:05:00.000Z',
              photoCount: 2,
            },
          ]
        : [];
    return Promise.resolve({ items, total: items.length, page: 1, limit: 20 });
  }

  inspection(inspectionId: string) {
    this.calls.push(`inspection:${inspectionId}`);
    this.throwIfFailing();
    if (inspectionId === MISSING) {
      return Promise.reject(
        new FiscalizaApiError(404, 'Vistoria não encontrada.', 'INSPECTION_NOT_FOUND'),
      );
    }
    return Promise.resolve(this.inspectionDetail);
  }

  private throwIfFailing(): void {
    if (this.failWith !== undefined) throw this.failWith;
  }
}
