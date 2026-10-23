import { z } from 'zod';
import { Role } from '../enums/role.js';

// Only what the Cognito access token guarantees: e-mail and name come from the ID token on /me
export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  role: z.enum(Role),
});

export const meResponseSchema = authenticatedUserSchema.extend({
  email: z.email(),
  name: z.string().min(1),
});

// GET /users serves the inspector picker of a site; no other listing exists in the MVP
export const userFilterSchema = z.object({ role: z.literal(Role.INSPECTOR) });

export const userSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.email(),
});

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type UserFilter = z.infer<typeof userFilterSchema>;
export type UserSummary = z.infer<typeof userSummarySchema>;
