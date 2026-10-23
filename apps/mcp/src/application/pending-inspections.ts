import type { Compliance } from '@fiscaliza/shared';
import type { FiscalizaApi } from './ports/fiscaliza-api.js';

export interface PendingInspection {
  id: string;
  constructionSiteName?: string;
  inspectorName?: string;
  compliance?: Compliance;
  photoCount?: number;
  // When it was submitted (or last changed, in the per-site listing)
  at: string;
}

export interface PendingInspections {
  // Set when the list is of one site
  constructionSiteName?: string;
  items: PendingInspection[];
  total: number;
}

// Without a site: everything awaiting a decision (dashboard). With a site: its SUBMITTED inspections.
export async function pendingInspections(
  api: FiscalizaApi,
  input: { constructionSiteId?: string },
): Promise<PendingInspections> {
  const dashboard = await api.dashboard();
  const { awaitingDecision } = dashboard;

  if (input.constructionSiteId === undefined) {
    return {
      items: awaitingDecision.map((item) => ({
        id: item.id,
        constructionSiteName: item.constructionSite.name,
        inspectorName: item.inspector.name,
        at: item.submittedAt,
      })),
      total: awaitingDecision.length,
    };
  }

  const page = await api.siteInspections(input.constructionSiteId, 'SUBMITTED');
  const inspectorNames = new Map(awaitingDecision.map((item) => [item.id, item.inspector.name]));
  return {
    constructionSiteName: dashboard.sites.find((site) => site.id === input.constructionSiteId)
      ?.name,
    items: page.items.map((item) => ({
      id: item.id,
      inspectorName: inspectorNames.get(item.id),
      compliance: item.compliance,
      photoCount: item.photoCount,
      at: item.updatedAt,
    })),
    total: page.total,
  };
}
