import { describe, expect, it } from 'vitest';
import { errorResponseSchema, MAX_PAGE_LIMIT, paginationSchema } from '../src';

describe('paginationSchema', () => {
  it('defaults to page 1 and limit 20', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces query string values', () => {
    expect(paginationSchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
  });

  it('rejects a limit above the maximum', () => {
    expect(paginationSchema.safeParse({ limit: MAX_PAGE_LIMIT + 1 }).success).toBe(false);
  });

  it('rejects a page below 1', () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('errorResponseSchema', () => {
  it('accepts the error format of the API', () => {
    const response = {
      code: 'RN-04',
      message:
        'A vistoria precisa de observação com 30 caracteres e pelo menos 1 foto para ser enviada.',
      details: [{ field: 'photos', problem: 'mínimo 1' }],
      correlationId: 'c1a2',
    };
    expect(errorResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects an unknown error code', () => {
    const response = { code: 'RN-99', message: 'x', details: [], correlationId: 'c1a2' };
    expect(errorResponseSchema.safeParse(response).success).toBe(false);
  });
});
