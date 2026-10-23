import { describe, expect, it } from 'vitest';
import { authenticatedUserSchema, meResponseSchema } from '../src/index.js';

const inspector = {
  id: '3c1f9a2e-sub-do-cognito',
  email: 'fiscal@fiscaliza.dev',
  name: 'Fiscal de Teste',
  role: 'INSPECTOR',
};

describe('authenticatedUserSchema', () => {
  it('accepts the user taken from the token', () => {
    expect(authenticatedUserSchema.parse(inspector)).toEqual(inspector);
  });

  it('rejects an unknown role', () => {
    expect(authenticatedUserSchema.safeParse({ ...inspector, role: 'ADMIN' }).success).toBe(false);
  });

  it('rejects an invalid e-mail and an empty id', () => {
    expect(authenticatedUserSchema.safeParse({ ...inspector, email: 'fiscal' }).success).toBe(
      false,
    );
    expect(authenticatedUserSchema.safeParse({ ...inspector, id: '' }).success).toBe(false);
  });
});

describe('meResponseSchema', () => {
  it('accepts the body of GET /me', () => {
    const manager = { ...inspector, role: 'MANAGER' };
    expect(meResponseSchema.parse(manager)).toEqual(manager);
  });
});
