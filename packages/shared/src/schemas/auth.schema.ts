import { z } from 'zod';
import { Role } from '../enums/role.js';

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(Role),
});

// Same fields as the token user today, but a separate contract so /me can grow alone
export const meResponseSchema = authenticatedUserSchema;

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
