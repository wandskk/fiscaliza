import { z } from 'zod';
import { ErrorCode } from '../errors/error-codes.js';

export const errorDetailSchema = z.object({
  field: z.string(),
  problem: z.string(),
});

export const errorResponseSchema = z.object({
  code: z.enum(ErrorCode),
  message: z.string(),
  details: z.array(errorDetailSchema),
  correlationId: z.string(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
