import { z } from 'zod';
import { ERROR_MESSAGES } from '../errors/error-codes.js';

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const uploadUrlRequestSchema = z.object({
  contentType: z.string(),
  size: z.number().int().positive(),
});

export const photoFileSchema = uploadUrlRequestSchema.refine(
  ({ contentType, size }) =>
    ACCEPTED_PHOTO_TYPES.some((type) => type === contentType) && size <= MAX_PHOTO_SIZE,
  { message: ERROR_MESSAGES['RN-05'] },
);

export const uploadUrlResponseSchema = z.object({
  url: z.url(),
  key: z.string(),
  expiresAt: z.iso.datetime(),
});

export const confirmPhotoSchema = z.object({ key: z.string().min(1) });

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type ConfirmPhoto = z.infer<typeof confirmPhotoSchema>;
