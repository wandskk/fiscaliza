import { MIN_NOTES_LENGTH, type InspectionDetail } from '@fiscaliza/shared';
import { canEdit } from './can-edit';

type SubmittableInspection = Pick<InspectionDetail, 'inspectorId' | 'status' | 'notes'> & {
  photos: readonly unknown[];
};

export function canSubmit(inspection: SubmittableInspection, viewerId: string): boolean {
  return (
    canEdit(inspection, viewerId) &&
    inspection.notes.trim().length >= MIN_NOTES_LENGTH &&
    inspection.photos.length > 0
  );
}
