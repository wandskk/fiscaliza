import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeInspectionPhoto } from '@/features/inspections/api/inspections.api';
import { inspectionKeys } from './use-inspection';

interface RemovePhotoInput {
  inspectionId: string;
  photoId: string;
}

export function useRemovePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inspectionId, photoId }: RemovePhotoInput) =>
      removeInspectionPhoto(inspectionId, photoId),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: inspectionKeys.detail(input.inspectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: inspectionKeys.siteListsRoot(),
      });
    },
  });
}
