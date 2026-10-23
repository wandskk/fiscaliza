import type { ConstructionSiteResponse, StatusCounts } from '@fiscaliza/shared';
import type { FiscalizaApi } from './ports/fiscaliza-api.js';

// The API returns at most this many per page; one page is enough for a conversation
const SITES_LIMIT = 100;

const NO_COUNTS: StatusCounts = { SUBMITTED: 0, RETURNED: 0, APPROVED: 0 };

export interface SiteWithCounts {
  site: ConstructionSiteResponse;
  counts: StatusCounts;
}

export interface ConstructionSiteList {
  sites: SiteWithCounts[];
  // Total of sites that match the search, which may be more than the ones listed
  total: number;
}

// Joins the sites (searchable) with the counts of the dashboard (one number per status)
export async function listConstructionSites(
  api: FiscalizaApi,
  input: { search?: string },
): Promise<ConstructionSiteList> {
  const [page, dashboard] = await Promise.all([
    api.listConstructionSites({ search: input.search, limit: SITES_LIMIT }),
    api.dashboard(),
  ]);
  const countsById = new Map(dashboard.sites.map((site) => [site.id, site.counts]));

  return {
    sites: page.items.map((site) => ({ site, counts: countsById.get(site.id) ?? NO_COUNTS })),
    total: page.total,
  };
}
