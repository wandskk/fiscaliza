import { useQuery } from '@tanstack/react-query';
import { getConstructionSite } from '@/features/construction-sites/api/construction-sites.api';
import { constructionSiteKeys } from './use-construction-sites';

export function useConstructionSite(id: string | undefined) {
  return useQuery({
    queryKey: constructionSiteKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getConstructionSite(id ?? '', signal),
    enabled: Boolean(id),
  });
}
