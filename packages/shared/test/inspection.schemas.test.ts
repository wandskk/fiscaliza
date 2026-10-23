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
} from '../src/index.js';

const SITE_ID = '10000000-0000-4000-8000-000000000001';

describe('inspection shared contracts', () => {
  it('RN-02: accepts an inspection draft and status filter', () => {
    expect(
      createInspectionSchema.parse({
        constructionSiteId: SITE_ID,
        notes: '',
        compliance: Compliance.COMPLIANT,
      }),
    ).toEqual({ constructionSiteId: SITE_ID, notes: '', compliance: Compliance.COMPLIANT });
    expect(updateInspectionSchema.parse({ notes: 'updated' })).toEqual({ notes: 'updated' });
    expect(inspectionFilterSchema.parse({ status: InspectionStatus.DRAFT, page: '2' })).toEqual({
      status: InspectionStatus.DRAFT,
      page: 2,
      limit: 20,
    });
    expect(
      inspectionDetailSchema.safeParse({
        id: SITE_ID,
        constructionSiteId: SITE_ID,
        inspectorId: 'inspector',
        notes: '',
        compliance: Compliance.COMPLIANT,
        status: InspectionStatus.DRAFT,
        returnReason: null,
        photos: [],
        statusChanges: [],
        report: null,
        createdAt: '2026-10-23T12:00:00.000Z',
        updatedAt: '2026-10-23T12:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects a site id that is not a UUID, notes above 5000 characters and an empty update', () => {
    const draft = { constructionSiteId: SITE_ID, notes: '', compliance: Compliance.COMPLIANT };

    expect(createInspectionSchema.safeParse({ ...draft, constructionSiteId: 'site' }).success).toBe(
      false,
    );
    expect(createInspectionSchema.safeParse({ ...draft, notes: 'x'.repeat(5001) }).success).toBe(
      false,
    );
    expect(updateInspectionSchema.safeParse({}).success).toBe(false);
  });

  it('dates in the detail are ISO strings, as they travel in JSON', () => {
    const detail = {
      id: SITE_ID,
      constructionSiteId: SITE_ID,
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
    };

    expect(inspectionDetailSchema.safeParse(detail).success).toBe(false);
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
