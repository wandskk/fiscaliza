import {
  confirmPhotoSchema,
  createInspectionSchema,
  inspectionDetailSchema,
  inspectionFilterSchema,
  inspectionPageSchema,
  updateInspectionSchema,
  uploadUrlRequestSchema,
  uploadUrlResponseSchema,
} from '@fiscaliza/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateInspectionDto extends createZodDto(createInspectionSchema) {}
export class UpdateInspectionDto extends createZodDto(updateInspectionSchema) {}
export class InspectionFilterDto extends createZodDto(inspectionFilterSchema) {}
export class InspectionDetailDto extends createZodDto(inspectionDetailSchema) {}
export class InspectionPageDto extends createZodDto(inspectionPageSchema) {}
export class UploadUrlRequestDto extends createZodDto(uploadUrlRequestSchema) {}
export class UploadUrlResponseDto extends createZodDto(uploadUrlResponseSchema) {}
export class ConfirmPhotoDto extends createZodDto(confirmPhotoSchema) {}
