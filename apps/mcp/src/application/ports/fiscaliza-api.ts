import type {
  ConstructionSiteResponse,
  Dashboard,
  InspectionDetail,
  InspectionPageResponse,
  InspectionStatus,
} from '@fiscaliza/shared';

export interface ConstructionSiteQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ConstructionSitePage {
  items: ConstructionSiteResponse[];
  total: number;
  page: number;
  limit: number;
}

// The read side of the Fiscaliza API; the MCP server never reaches the database
export interface FiscalizaApi {
  listConstructionSites(query: ConstructionSiteQuery): Promise<ConstructionSitePage>;
  dashboard(): Promise<Dashboard>;
  siteInspections(
    constructionSiteId: string,
    status: InspectionStatus,
  ): Promise<InspectionPageResponse>;
  inspection(inspectionId: string): Promise<InspectionDetail>;
}

// The message is already in Portuguese, ready to be shown to the user
export class FiscalizaApiError extends Error {
  constructor(
    readonly status: number | undefined,
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'FiscalizaApiError';
  }
}
