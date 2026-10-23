import type { ConstructionSiteDetail, ConstructionSiteResponse } from '@fiscaliza/shared';
import type { ConstructionSite } from '../domain/construction-site.entity';

export function toResponse(site: ConstructionSite): ConstructionSiteResponse {
  const { inspectorIds, createdAt, ...fields } = site.toProps();
  return { ...fields, inspectorCount: inspectorIds.length, createdAt: createdAt.toISOString() };
}

export function toDetail(site: ConstructionSite): ConstructionSiteDetail {
  return { ...toResponse(site), inspectorIds: site.inspectorIds };
}
