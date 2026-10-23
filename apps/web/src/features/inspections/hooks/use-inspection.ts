import { useQuery } from '@tanstack/react-query';
import {
  getInspection,
  type SiteInspectionFilter,
} from '@/features/inspections/api/inspections.api';

export const inspectionKeys = {
  all: ['inspections'] as const,
  siteListsRoot: () => [...inspectionKeys.all, 'site-list'] as const,
  siteLists: (constructionSiteId: string) =>
    [...inspectionKeys.siteListsRoot(), constructionSiteId] as const,
  siteList: (constructionSiteId: string, filter: SiteInspectionFilter) =>
    [...inspectionKeys.siteLists(constructionSiteId), filter] as const,
  details: () => [...inspectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...inspectionKeys.details(), id] as const,
};

export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: inspectionKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getInspection(id ?? '', signal),
    enabled: Boolean(id),
  });
}
