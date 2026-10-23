import type { CreateInspection, UpdateInspection } from '@fiscaliza/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInspection, updateInspection } from '@/features/inspections/api/inspections.api';
import { inspectionKeys } from './use-inspection';

type SaveInspectionInput =
  { id?: never; data: CreateInspection } | { id: string; data: UpdateInspection };

export function useSaveInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInspectionInput) =>
      input.id === undefined
        ? createInspection(input.data)
        : updateInspection(input.id, input.data),
    onSuccess: async (inspection) => {
      queryClient.setQueryData(inspectionKeys.detail(inspection.id), inspection);
      await queryClient.invalidateQueries({ queryKey: inspectionKeys.detail(inspection.id) });
      await queryClient.invalidateQueries({
        queryKey: inspectionKeys.siteLists(inspection.constructionSiteId),
      });
    },
  });
}
