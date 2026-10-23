import { z } from 'zod';
import { paginationSchema } from './pagination.schema.js';

const name = z.string().trim().min(3).max(120);
const contract = z.string().trim().min(3).max(40);
const address = z.string().trim().min(5).max(200);

export const createConstructionSiteSchema = z.object({ name, contract, address });

// Closing is a field of the edit; reopening is refused by the domain (CONSTRUCTION_SITE_CLOSED)
export const updateConstructionSiteSchema = z
  .object({
    name: name.optional(),
    contract: contract.optional(),
    address: address.optional(),
    closed: z.boolean().optional(),
  })
  .refine((change) => Object.values(change).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para alterar.',
  });

export const assignInspectorsSchema = z.object({
  inspectorIds: z.array(z.string().min(1)).max(50),
});

// Query string: a blank search means no search, and closed arrives as "true" or "false"
export const constructionSiteFilterSchema = paginationSchema.extend({
  search: z
    .string()
    .trim()
    .max(120)
    .transform((value) => value || undefined)
    .optional(),
  closed: z.stringbool().optional(),
});

export const constructionSiteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  contract: z.string(),
  address: z.string(),
  closed: z.boolean(),
  inspectorCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

export const constructionSiteDetailSchema = constructionSiteSchema.extend({
  inspectorIds: z.array(z.string()),
});

export type CreateConstructionSite = z.infer<typeof createConstructionSiteSchema>;
export type UpdateConstructionSite = z.infer<typeof updateConstructionSiteSchema>;
export type AssignInspectors = z.infer<typeof assignInspectorsSchema>;
export type ConstructionSiteFilter = z.infer<typeof constructionSiteFilterSchema>;
export type ConstructionSiteResponse = z.infer<typeof constructionSiteSchema>;
export type ConstructionSiteDetail = z.infer<typeof constructionSiteDetailSchema>;
