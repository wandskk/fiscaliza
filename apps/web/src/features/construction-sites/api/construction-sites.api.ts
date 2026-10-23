import {
  constructionSiteDetailSchema,
  constructionSiteSchema,
  paginatedSchema,
  userSummarySchema,
  type AssignInspectors,
  type ConstructionSiteDetail,
  type ConstructionSiteFilter,
  type ConstructionSiteResponse,
  type CreateConstructionSite,
  type UpdateConstructionSite,
  type UserSummary,
} from '@fiscaliza/shared';
import { z } from 'zod';
import { http } from '@/lib/http';

export type ConstructionSiteListFilter = Partial<ConstructionSiteFilter>;

export function listConstructionSites(
  filter: ConstructionSiteListFilter = {},
  signal?: AbortSignal,
): Promise<{ items: ConstructionSiteResponse[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (filter.search) params.set('search', filter.search);
  if (filter.closed !== undefined) params.set('closed', String(filter.closed));
  if (filter.page !== undefined) params.set('page', String(filter.page));
  if (filter.limit !== undefined) params.set('limit', String(filter.limit));
  const query = params.toString();
  return http.get(
    `/construction-sites${query ? `?${query}` : ''}`,
    paginatedSchema(constructionSiteSchema),
    signal,
  );
}

export function getConstructionSite(
  id: string,
  signal?: AbortSignal,
): Promise<ConstructionSiteDetail> {
  return http.get(
    `/construction-sites/${encodeURIComponent(id)}`,
    constructionSiteDetailSchema,
    signal,
  );
}

export function createConstructionSite(
  input: CreateConstructionSite,
): Promise<ConstructionSiteResponse> {
  return http.post('/construction-sites', input, constructionSiteSchema);
}

export function updateConstructionSite(
  id: string,
  input: UpdateConstructionSite,
): Promise<ConstructionSiteResponse> {
  return http.patch(`/construction-sites/${encodeURIComponent(id)}`, input, constructionSiteSchema);
}

export function assignInspectors(
  id: string,
  input: AssignInspectors,
): Promise<ConstructionSiteDetail> {
  return http.put(
    `/construction-sites/${encodeURIComponent(id)}/inspectors`,
    input,
    constructionSiteDetailSchema,
  );
}

export function listInspectors(signal?: AbortSignal): Promise<UserSummary[]> {
  return http.get('/users?role=INSPECTOR', z.array(userSummarySchema), signal);
}
