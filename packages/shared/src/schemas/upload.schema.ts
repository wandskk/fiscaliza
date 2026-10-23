import { z } from 'zod';

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
  { message: 'RN-05: Cada foto deve ser JPEG, PNG ou WebP e ter até 10 MB.' },
);

export const confirmPhotoSchema = z.object({ key: z.string().min(1) });

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>;
export type ConfirmPhoto = z.infer<typeof confirmPhotoSchema>;
