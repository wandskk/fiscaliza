import { z } from 'zod';
import { Compliance } from '../enums/compliance.js';
import { InspectionStatus } from '../enums/inspection-status.js';
import { paginatedSchema, paginationSchema } from './pagination.schema.js';
import { reportSchema } from './report.schema.js';

export const MIN_NOTES_LENGTH = 30;

// A draft may have short notes: the 30 characters of RN-04 are checked on submit
export const createInspectionSchema = z.object({
  constructionSiteId: z.uuid(),
  notes: z.string().trim().max(5000),
  compliance: z.enum(Compliance),
});

export const updateInspectionSchema = createInspectionSchema
  .pick({ notes: true, compliance: true })
  .partial()
  .refine((change) => Object.values(change).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para alterar.',
  });

export const inspectionDetailSchema = z.object({
  ...createInspectionSchema.shape,
  id: z.uuid(),
  inspectorId: z.string(),
  status: z.enum(InspectionStatus),
  returnReason: z.string().nullable(),
  photos: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      contentType: z.string(),
      size: z.number().int().positive(),
      // Presigned read URL, valid for 5 minutes
      url: z.string(),
    }),
  ),
  history: z.array(
    z.object({
      from: z.enum(InspectionStatus).nullable(),
      to: z.enum(InspectionStatus),
      user: z.object({ id: z.string(), name: z.string() }),
      at: z.iso.datetime(),
    }),
  ),
  // Report of the current submission; null while it is being generated
  report: reportSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const inspectionFilterSchema = paginationSchema.extend({
  status: z.enum(InspectionStatus).optional(),
});

export const inspectionSummarySchema = z.object({
  id: z.uuid(),
  status: z.enum(InspectionStatus),
  compliance: z.enum(Compliance),
  inspectorId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  photoCount: z.number().int().min(0),
});

export const inspectionPageSchema = paginatedSchema(inspectionSummarySchema);

export type CreateInspection = z.infer<typeof createInspectionSchema>;
export type UpdateInspection = z.infer<typeof updateInspectionSchema>;
export type InspectionDetail = z.infer<typeof inspectionDetailSchema>;
export type InspectionFilter = z.infer<typeof inspectionFilterSchema>;
export type InspectionSummary = z.infer<typeof inspectionSummarySchema>;
export type InspectionPageResponse = z.infer<typeof inspectionPageSchema>;
