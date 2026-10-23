// What the inspections module (spec 003) may ask about a site, without reading its tables
export interface ConstructionSiteAccess {
  // RN-01
  isInspectorAssigned(constructionSiteId: string, inspectorId: string): Promise<boolean>;
  // RN-10; throws ConstructionSiteNotFoundError for an unknown site
  acceptsInspections(constructionSiteId: string): Promise<boolean>;
}

export const CONSTRUCTION_SITE_ACCESS = Symbol('CONSTRUCTION_SITE_ACCESS');
