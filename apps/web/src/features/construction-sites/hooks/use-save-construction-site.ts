import type { CreateConstructionSite, UpdateConstructionSite } from '@fiscaliza/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createConstructionSite,
  updateConstructionSite,
} from '@/features/construction-sites/api/construction-sites.api';
import { constructionSiteKeys } from './use-construction-sites';

type SaveConstructionSiteInput =
  { id?: never; data: CreateConstructionSite } | { id: string; data: UpdateConstructionSite };

export function useSaveConstructionSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveConstructionSiteInput) => {
      if (input.id !== undefined) return updateConstructionSite(input.id, input.data);
      return createConstructionSite(input.data);
    },
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: constructionSiteKeys.lists() });
      if (input.id) {
        await queryClient.invalidateQueries({ queryKey: constructionSiteKeys.detail(input.id) });
      }
    },
  });
}
