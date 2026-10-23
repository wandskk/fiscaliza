import {
  inspectionDetailSchema,
  inspectionPageSchema,
  uploadUrlResponseSchema,
  type ConfirmPhoto,
  type CreateInspection,
  type InspectionDetail,
  type InspectionFilter,
  type InspectionPageResponse,
  type UpdateInspection,
  type UploadUrlRequest,
  type UploadUrlResponse,
} from '@fiscaliza/shared';
import { http } from '@/lib/http';

export type SiteInspectionFilter = Partial<InspectionFilter>;

export function listSiteInspections(
  constructionSiteId: string,
  filter: SiteInspectionFilter = {},
  signal?: AbortSignal,
): Promise<InspectionPageResponse> {
  const params = new URLSearchParams();
  if (filter.status !== undefined) params.set('status', filter.status);
  if (filter.page !== undefined) params.set('page', String(filter.page));
  if (filter.limit !== undefined) params.set('limit', String(filter.limit));
  const query = params.toString();
  const path = `/construction-sites/${encodeURIComponent(constructionSiteId)}/inspections`;
  return http.get(`${path}${query ? `?${query}` : ''}`, inspectionPageSchema, signal);
}

export function getInspection(id: string, signal?: AbortSignal): Promise<InspectionDetail> {
  return http.get(`/inspections/${encodeURIComponent(id)}`, inspectionDetailSchema, signal);
}

export function createInspection(input: CreateInspection): Promise<InspectionDetail> {
  return http.post('/inspections', input, inspectionDetailSchema);
}

export function updateInspection(id: string, input: UpdateInspection): Promise<InspectionDetail> {
  return http.patch(`/inspections/${encodeURIComponent(id)}`, input, inspectionDetailSchema);
}

export function submitInspection(id: string): Promise<InspectionDetail> {
  return http.post(
    `/inspections/${encodeURIComponent(id)}/submit`,
    undefined,
    inspectionDetailSchema,
  );
}

export function requestInspectionPhotoUpload(
  id: string,
  input: UploadUrlRequest,
): Promise<UploadUrlResponse> {
  return http.post(
    `/inspections/${encodeURIComponent(id)}/photos/upload-url`,
    input,
    uploadUrlResponseSchema,
  );
}

export function confirmInspectionPhoto(id: string, input: ConfirmPhoto): Promise<InspectionDetail> {
  return http.post(`/inspections/${encodeURIComponent(id)}/photos`, input, inspectionDetailSchema);
}

export function removeInspectionPhoto(id: string, photoId: string): Promise<void> {
  return http.delete(
    `/inspections/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
  );
}
