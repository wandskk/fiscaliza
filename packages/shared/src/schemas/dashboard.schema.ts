import { z } from 'zod';

// DRAFT is not here on purpose: a draft is not visible to the manager.
// Always the three keys, with zero when there is none
export const statusCountsSchema = z.object({
  SUBMITTED: z.number().int().min(0),
  RETURNED: z.number().int().min(0),
  APPROVED: z.number().int().min(0),
});

export const dashboardSchema = z.object({
  totals: statusCountsSchema,
  sites: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      closed: z.boolean(),
      counts: statusCountsSchema,
    }),
  ),
  awaitingDecision: z.array(
    z.object({
      id: z.uuid(),
      constructionSite: z.object({ id: z.uuid(), name: z.string() }),
      inspector: z.object({ id: z.uuid(), name: z.string() }),
      submittedAt: z.iso.datetime(),
    }),
  ),
});

export type StatusCounts = z.infer<typeof statusCountsSchema>;
export type Dashboard = z.infer<typeof dashboardSchema>;
