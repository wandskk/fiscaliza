import { InspectionStatus, MIN_NOTES_LENGTH } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { canEdit } from './can-edit';
import { canSubmit } from './can-submit';

const editableInspection = {
  inspectorId: 'inspector-1',
  status: InspectionStatus.DRAFT,
};

describe('inspection permissions', () => {
  it('RN-01: only the owner can edit a draft or returned inspection', () => {
    expect(canEdit(editableInspection, 'inspector-1')).toBe(true);
    expect(canEdit(editableInspection, 'inspector-2')).toBe(false);
    expect(
      canEdit({ ...editableInspection, status: InspectionStatus.RETURNED }, 'inspector-1'),
    ).toBe(true);
  });

  it('RN-03/RN-07: submitted and approved inspections cannot be edited', () => {
    expect(
      canEdit({ ...editableInspection, status: InspectionStatus.SUBMITTED }, 'inspector-1'),
    ).toBe(false);
    expect(
      canEdit({ ...editableInspection, status: InspectionStatus.APPROVED }, 'inspector-1'),
    ).toBe(false);
  });

  it('RN-04: submit requires owner, editable status, minimum notes and one photo', () => {
    const complete = {
      ...editableInspection,
      notes: 'a'.repeat(MIN_NOTES_LENGTH),
      photos: [{ id: 'photo-1' }],
    };
    expect(canSubmit(complete, 'inspector-1')).toBe(true);
    expect(canSubmit({ ...complete, notes: 'a'.repeat(MIN_NOTES_LENGTH - 1) }, 'inspector-1')).toBe(
      false,
    );
    expect(canSubmit({ ...complete, photos: [] }, 'inspector-1')).toBe(false);
    expect(canSubmit(complete, 'inspector-2')).toBe(false);
  });
});
