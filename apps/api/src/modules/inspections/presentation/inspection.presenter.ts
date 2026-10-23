import type { InspectionDetail, InspectionSummary } from '@fiscaliza/shared';
import type { InspectionView } from '../application/get-inspection.use-case';
import type { InspectionListItem } from '../application/ports/inspection.repository';

export function toDetail({ inspection, history, photoUrls }: InspectionView): InspectionDetail {
  const props = inspection.toProps();
  return {
    id: props.id,
    constructionSiteId: props.constructionSiteId,
    inspectorId: props.inspectorId,
    notes: props.notes,
    compliance: props.compliance,
    status: props.status,
    returnReason: props.returnReason,
    photos: props.photos.map(({ id, key, contentType, size }) => ({
      id,
      key,
      contentType,
      size,
      url: photoUrls[id] ?? '',
    })),
    history: history.map(({ from, to, user, at }) => ({ from, to, user, at: at.toISOString() })),
    report: null,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toSummary({
  createdAt,
  updatedAt,
  ...fields
}: InspectionListItem): InspectionSummary {
  return { ...fields, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}
