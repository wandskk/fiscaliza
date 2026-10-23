import { describe, expect, it } from 'vitest';
import { inspectionDetail } from '../src/application/inspection-detail.js';
import { listConstructionSites } from '../src/application/list-construction-sites.js';
import { pendingInspections } from '../src/application/pending-inspections.js';
import { FiscalizaApiError } from '../src/application/ports/fiscaliza-api.js';
import {
  FakeFiscalizaApi,
  INSPECTION_1,
  INSPECTION_2,
  MISSING,
  PHOTO_URL,
  SITE_A,
  SITE_B,
} from './support/fake-api.js';

describe('listConstructionSites', () => {
  it('joins each site with the counts of the dashboard', async () => {
    const result = await listConstructionSites(new FakeFiscalizaApi(), {});

    expect(result.total).toBe(2);
    expect(result.sites[0]?.counts).toEqual({ SUBMITTED: 2, RETURNED: 1, APPROVED: 3 });
  });

  it('uses zeros for a site the dashboard does not know', async () => {
    const result = await listConstructionSites(new FakeFiscalizaApi(), {});

    const ponte = result.sites.find(({ site }) => site.id === SITE_B);
    expect(ponte?.counts).toEqual({ SUBMITTED: 0, RETURNED: 0, APPROVED: 0 });
  });

  it('passes the search to the API', async () => {
    const api = new FakeFiscalizaApi();

    const result = await listConstructionSites(api, { search: 'ponte' });

    expect(api.calls).toContain('listConstructionSites:ponte');
    expect(result.sites.map(({ site }) => site.id)).toEqual([SITE_B]);
  });
});

describe('pendingInspections', () => {
  it('without a site, lists what awaits a decision from the dashboard', async () => {
    const api = new FakeFiscalizaApi();

    const result = await pendingInspections(api, {});

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual([INSPECTION_1, INSPECTION_2]);
    expect(result.items[0]).toMatchObject({
      constructionSiteName: 'Edifício Aurora',
      inspectorName: 'Carla Fiscal',
    });
    expect(api.calls).toEqual(['dashboard']);
  });

  it('with a site, asks the SUBMITTED inspections of that site', async () => {
    const api = new FakeFiscalizaApi();

    const result = await pendingInspections(api, { constructionSiteId: SITE_A });

    expect(api.calls).toContain(`siteInspections:${SITE_A}:SUBMITTED`);
    expect(result.constructionSiteName).toBe('Edifício Aurora');
    expect(result.items).toEqual([
      expect.objectContaining({
        id: INSPECTION_1,
        inspectorName: 'Carla Fiscal',
        compliance: 'NON_COMPLIANT',
        photoCount: 2,
      }),
    ]);
  });

  it('with a site without pending inspections, returns an empty list', async () => {
    const result = await pendingInspections(new FakeFiscalizaApi(), {
      constructionSiteId: SITE_B,
    });

    expect(result).toMatchObject({ items: [], total: 0 });
  });
});

describe('inspectionDetail', () => {
  it('returns the detail without the photo URLs', async () => {
    const result = await inspectionDetail(new FakeFiscalizaApi(), { inspectionId: INSPECTION_1 });

    expect(result.photoCount).toBe(2);
    expect(result).not.toHaveProperty('photos');
    expect(JSON.stringify(result)).not.toContain(PHOTO_URL);
  });

  it('lets the error of an inspection that does not exist through', async () => {
    const promise = inspectionDetail(new FakeFiscalizaApi(), { inspectionId: MISSING });

    await expect(promise).rejects.toBeInstanceOf(FiscalizaApiError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });
});
