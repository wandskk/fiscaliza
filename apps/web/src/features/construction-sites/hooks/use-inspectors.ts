import { useQuery } from '@tanstack/react-query';
import { listInspectors } from '@/features/construction-sites/api/construction-sites.api';

export const INSPECTORS_QUERY_KEY = ['inspectors'] as const;

export function useInspectors(enabled = true) {
  return useQuery({
    queryKey: INSPECTORS_QUERY_KEY,
    queryFn: ({ signal }) => listInspectors(signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
