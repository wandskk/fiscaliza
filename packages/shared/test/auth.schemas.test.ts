import { describe, expect, it } from 'vitest';
import { authenticatedUserSchema, meResponseSchema } from '../src/index.js';

const inspector = { id: '3c1f9a2e-sub-do-cognito', role: 'INSPECTOR' };

describe('authenticatedUserSchema', () => {
  it('accepts the user taken from the access token', () => {
    expect(authenticatedUserSchema.parse(inspector)).toEqual(inspector);
  });

  it('rejects an unknown role and an empty id', () => {
    expect(authenticatedUserSchema.safeParse({ ...inspector, role: 'ADMIN' }).success).toBe(false);
    expect(authenticatedUserSchema.safeParse({ ...inspector, id: '' }).success).toBe(false);
  });
});

describe('meResponseSchema', () => {
  const me = { ...inspector, email: 'fiscal@fiscaliza.dev', name: 'Fiscal de Teste' };

  it('accepts the body of GET /me', () => {
    expect(meResponseSchema.parse(me)).toEqual(me);
  });

  it('rejects an invalid e-mail and an empty name', () => {
    expect(meResponseSchema.safeParse({ ...me, email: 'fiscal' }).success).toBe(false);
    expect(meResponseSchema.safeParse({ ...me, name: '' }).success).toBe(false);
  });
});
