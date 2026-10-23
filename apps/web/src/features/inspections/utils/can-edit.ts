import { InspectionStatus, type InspectionDetail } from '@fiscaliza/shared';

type EditableInspection = Pick<InspectionDetail, 'inspectorId' | 'status'>;

export function canEdit(inspection: EditableInspection, viewerId: string): boolean {
  const editableStatus =
    inspection.status === InspectionStatus.DRAFT || inspection.status === InspectionStatus.RETURNED;
  return inspection.inspectorId === viewerId && editableStatus;
}
