import { describe, expect, it } from 'vitest';
import {
  Compliance,
  ErrorCode,
  ERROR_MESSAGES,
  InspectionStatus,
  MAX_PHOTOS,
  MIN_NOTES_LENGTH,
  MAX_PHOTO_SIZE,
  ACCEPTED_PHOTO_TYPES,
  createInspectionSchema,
  updateInspectionSchema,
  inspectionDetailSchema,
  inspectionFilterSchema,
  uploadUrlRequestSchema,
  photoFileSchema,
  confirmPhotoSchema,
} from '@fiscaliza/shared';

describe('inspection shared contracts', () => {
  it('RN-02: accepts an inspection draft and status filter', () => {
    expect(
      createInspectionSchema.parse({
        constructionSiteId: 'site',
        notes: '',
        compliance: Compliance.COMPLIANT,
      }),
    ).toEqual({ constructionSiteId: 'site', notes: '', compliance: Compliance.COMPLIANT });
    expect(updateInspectionSchema.parse({ notes: 'updated' })).toEqual({ notes: 'updated' });
    expect(inspectionFilterSchema.parse({ status: InspectionStatus.DRAFT, page: '2' })).toEqual({
      status: InspectionStatus.DRAFT,
      page: 2,
      limit: 20,
    });
    expect(
      inspectionDetailSchema.safeParse({
        id: 'id',
        constructionSiteId: 'site',
        inspectorId: 'inspector',
        notes: '',
        compliance: Compliance.COMPLIANT,
        status: InspectionStatus.DRAFT,
        returnReason: null,
        photos: [],
        statusChanges: [],
        report: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).success,
    ).toBe(true);
  });

  it('RN-05: validates photo files but leaves upload requests to the domain', () => {
    expect(MAX_PHOTOS).toBe(10);
    expect(MIN_NOTES_LENGTH).toBe(30);
    expect(MAX_PHOTO_SIZE).toBe(10 * 1024 * 1024);
    expect(ACCEPTED_PHOTO_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    expect(
      uploadUrlRequestSchema.safeParse({ contentType: 'image/gif', size: MAX_PHOTO_SIZE + 1 })
        .success,
    ).toBe(true);
    expect(uploadUrlRequestSchema.safeParse({ contentType: 'image/jpeg', size: 0 }).success).toBe(
      false,
    );
    expect(photoFileSchema.safeParse({ contentType: 'image/gif', size: 100 }).success).toBe(false);
    expect(
      photoFileSchema.safeParse({ contentType: 'image/jpeg', size: MAX_PHOTO_SIZE + 1 }).success,
    ).toBe(false);
    expect(confirmPhotoSchema.parse({ key: 'key' })).toEqual({ key: 'key' });
    expect(ErrorCode.INVALID_PHOTO).toBe('INVALID_PHOTO');
    expect(ERROR_MESSAGES[ErrorCode.INSPECTION_NOT_FOUND]).toMatch(/vistoria/i);
  });
});
