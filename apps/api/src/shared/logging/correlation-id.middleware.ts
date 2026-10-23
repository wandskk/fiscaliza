import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { requestContext } from './request-context';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

// The client's id is reused only when it looks like an id, so it cannot inject text into the logs
const VALID_ID = /^[\w-]{1,64}$/;

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(CORRELATION_ID_HEADER);
  const correlationId = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();

  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  requestContext.run({ correlationId }, next);
}
