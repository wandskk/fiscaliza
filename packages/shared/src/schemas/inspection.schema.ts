import { z } from 'zod';
import { Compliance } from '../enums/compliance.js';
import { InspectionStatus } from '../enums/inspection-status.js';
import { paginationSchema } from './pagination.schema.js';

export const MIN_NOTES_LENGTH = 30;

export const createInspectionSchema = z.object({
  constructionSiteId: z.string().min(1),
  notes: z.string(),
  compliance: z.enum(Compliance),
});

export const updateInspectionSchema = createInspectionSchema
  .pick({ notes: true, compliance: true })
  .partial();

export const inspectionDetailSchema = createInspectionSchema.extend({
  id: z.string(),
  inspectorId: z.string(),
  status: z.enum(InspectionStatus),
  returnReason: z.string().nullable(),
  photos: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      contentType: z.string(),
      size: z.number().int().positive(),
    }),
  ),
  statusChanges: z.array(
    z.object({
      from: z.enum(InspectionStatus).nullable(),
      to: z.enum(InspectionStatus),
      userId: z.string(),
      at: z.date(),
    }),
  ),
  report: z.null(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const inspectionFilterSchema = paginationSchema.extend({
  status: z.enum(InspectionStatus).optional(),
});

export type CreateInspection = z.infer<typeof createInspectionSchema>;
export type UpdateInspection = z.infer<typeof updateInspectionSchema>;
export type InspectionDetail = z.infer<typeof inspectionDetailSchema>;
export type InspectionFilter = z.infer<typeof inspectionFilterSchema>;
