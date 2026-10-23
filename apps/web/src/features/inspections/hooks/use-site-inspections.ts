import { useQuery } from '@tanstack/react-query';
import {
  listSiteInspections,
  type SiteInspectionFilter,
} from '@/features/inspections/api/inspections.api';
import { inspectionKeys } from './use-inspection';

export function useSiteInspections(
  constructionSiteId: string | undefined,
  filter: SiteInspectionFilter = {},
) {
  return useQuery({
    queryKey: inspectionKeys.siteList(constructionSiteId ?? '', filter),
    queryFn: ({ signal }) => listSiteInspections(constructionSiteId ?? '', filter, signal),
    enabled: Boolean(constructionSiteId),
  });
}
