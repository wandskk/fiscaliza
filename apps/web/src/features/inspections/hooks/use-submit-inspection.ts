import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitInspection } from '@/features/inspections/api/inspections.api';
import { inspectionKeys } from './use-inspection';

export function useSubmitInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitInspection(id),
    onSuccess: async (inspection) => {
      queryClient.setQueryData(inspectionKeys.detail(inspection.id), inspection);
      await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspection.id) });
      await queryClient.invalidateQueries({
        queryKey: inspectionKeys.siteLists(inspection.constructionSiteId),
      });
    },
  });
}
