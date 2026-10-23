import {
  createInspectionSchema,
  inspectionDetailSchema,
  inspectionFilterSchema,
  inspectionPageSchema,
  updateInspectionSchema,
} from '@fiscaliza/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateInspectionDto extends createZodDto(createInspectionSchema) {}
export class UpdateInspectionDto extends createZodDto(updateInspectionSchema) {}
export class InspectionFilterDto extends createZodDto(inspectionFilterSchema) {}
export class InspectionDetailDto extends createZodDto(inspectionDetailSchema) {}
export class InspectionPageDto extends createZodDto(inspectionPageSchema) {}
