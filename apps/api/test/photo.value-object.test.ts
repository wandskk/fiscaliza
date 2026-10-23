import { ErrorCode, MAX_PHOTO_SIZE } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { Photo } from '../src/modules/inspections/domain/photo.value-object';
import { InvalidPhotoError } from '../src/modules/inspections/domain/inspection.errors';

describe('Photo', () => {
  it('RN-05: accepts JPEG, PNG and WebP up to and including 10 MB', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp']) {
      const photo = Photo.create({ id: 'photo', key: 'key', contentType, size: MAX_PHOTO_SIZE });
      expect(photo.contentType).toBe(contentType);
      expect(photo.size).toBe(MAX_PHOTO_SIZE);
      expect(photo.toProps()).toEqual({
        id: 'photo',
        key: 'key',
        contentType,
        size: MAX_PHOTO_SIZE,
      });
    }
  });

  it('RN-05: rejects other types, empty files and files larger than 10 MB', () => {
    for (const props of [
      { contentType: 'image/gif', size: 1 },
      { contentType: 'image/jpeg', size: 0 },
      { contentType: 'image/png', size: MAX_PHOTO_SIZE + 1 },
    ]) {
      try {
        Photo.create({ id: 'photo', key: 'key', ...props });
        throw new Error('Expected InvalidPhotoError');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidPhotoError);
        expect((error as InvalidPhotoError).code).toBe(ErrorCode.RN_05);
      }
    }
  });
});
