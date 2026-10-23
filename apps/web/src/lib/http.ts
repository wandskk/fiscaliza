import {
  ERROR_MESSAGES,
  ErrorCode,
  errorResponseSchema,
  type ErrorDetail,
} from '@fiscaliza/shared';
import type { z } from 'zod';
import { env } from '@/lib/env';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetail[];
  readonly correlationId: string;

  constructor(input: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    correlationId: string;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details ?? [];
    this.correlationId = input.correlationId;
  }
}

export interface HttpHandlers {
  getToken: () => Promise<string | null>;
  // Only /me needs it: name and e-mail come from the ID token, not from the access token
  getIdToken?: () => Promise<string | null>;
  onUnauthorized: () => void;
}

let handlers: HttpHandlers = {
  getToken: () => Promise.resolve(null),
  onUnauthorized: () => undefined,
};

// The session provider plugs the token source and the 401 reaction in here
export function configureHttp(next: HttpHandlers): void {
  handlers = next;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<T> {
  method?: Method;
  body?: unknown;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
  withIdToken?: boolean;
}

// Used when the body is not in the standard error format (proxy page, gateway error, etc.)
function fallbackCode(status: number): ErrorCode {
  if (status === 401) return ErrorCode.UNAUTHORIZED;
  if (status === 403) return ErrorCode.FORBIDDEN;
  if (status === 404) return ErrorCode.NOT_FOUND;
  return ErrorCode.INTERNAL_ERROR;
}

async function toApiError(response: Response, correlationId: string): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  const parsed = errorResponseSchema.safeParse(payload);
  if (parsed.success) {
    return new ApiError({ status: response.status, ...parsed.data });
  }
  const code = fallbackCode(response.status);
  return new ApiError({
    status: response.status,
    code,
    message: ERROR_MESSAGES[code],
    correlationId,
  });
}

export async function request<T>(path: string, options: RequestOptions<T>): Promise<T> {
  const { method = 'GET', body, schema, signal, withIdToken = false } = options;
  const correlationId = crypto.randomUUID();
  const headers: Record<string, string> = {
    'x-correlation-id': correlationId,
    Accept: 'application/json',
  };
  const token = await handlers.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (withIdToken) {
    const idToken = await handlers.getIdToken?.();
    if (idToken) headers['x-id-token'] = idToken;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({
      status: 0,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
      correlationId,
    });
  }

  if (!response.ok) {
    const error = await toApiError(response, correlationId);
    if (response.status === 401) handlers.onUnauthorized();
    throw error;
  }
  return schema.parse(await response.json());
}

export const http = {
  get: <T>(
    path: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
    options: { withIdToken?: boolean } = {},
  ) => request(path, { schema, signal, ...options }),
  post: <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    request(path, { method: 'POST', body, schema }),
  put: <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    request(path, { method: 'PUT', body, schema }),
  patch: <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
    request(path, { method: 'PATCH', body, schema }),
};
