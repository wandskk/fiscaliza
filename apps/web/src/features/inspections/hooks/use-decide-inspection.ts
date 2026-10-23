import type { Decision } from '@fiscaliza/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '@/features/dashboard/hooks/use-dashboard';
import { decideInspection } from '@/features/inspections/api/inspections.api';
import { inspectionKeys } from './use-inspection';

export function useDecideInspection(inspectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Decision) => decideInspection(inspectionId, body),
    onSuccess: async (inspection) => {
      queryClient.setQueryData(inspectionKeys.detail(inspection.id), inspection);
      await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspection.id) });
      await queryClient.invalidateQueries({
        queryKey: inspectionKeys.siteLists(inspection.constructionSiteId),
      });
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
