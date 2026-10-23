import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignInspectors } from '@/features/construction-sites/api/construction-sites.api';
import { constructionSiteKeys } from './use-construction-sites';

export function useAssignInspectors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, inspectorIds }: { id: string; inspectorIds: string[] }) =>
      assignInspectors(id, { inspectorIds }),
    onSuccess: async (_result, { id }) => {
      await queryClient.invalidateQueries({ queryKey: constructionSiteKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: constructionSiteKeys.detail(id) });
    },
  });
}
