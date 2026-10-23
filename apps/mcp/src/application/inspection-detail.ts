import type { InspectionDetail } from '@fiscaliza/shared';
import type { FiscalizaApi } from './ports/fiscaliza-api.js';

// The photos are reduced to a count: their URLs are presigned and must not leave the system
export type InspectionDetailView = Omit<InspectionDetail, 'photos'> & { photoCount: number };

export async function inspectionDetail(
  api: FiscalizaApi,
  input: { inspectionId: string },
): Promise<InspectionDetailView> {
  const { photos, ...detail } = await api.inspection(input.inspectionId);
  return { ...detail, photoCount: photos.length };
}
