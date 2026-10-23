import { useQuery } from '@tanstack/react-query';
import {
  listConstructionSites,
  type ConstructionSiteListFilter,
} from '@/features/construction-sites/api/construction-sites.api';

export const constructionSiteKeys = {
  all: ['construction-sites'] as const,
  lists: () => [...constructionSiteKeys.all, 'list'] as const,
  list: (filter: ConstructionSiteListFilter) => [...constructionSiteKeys.lists(), filter] as const,
  detail: (id: string) => [...constructionSiteKeys.all, 'detail', id] as const,
};

export function useConstructionSites(filter: ConstructionSiteListFilter = {}) {
  return useQuery({
    queryKey: constructionSiteKeys.list(filter),
    queryFn: ({ signal }) => listConstructionSites(filter, signal),
  });
}
