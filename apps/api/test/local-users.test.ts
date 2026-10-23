import { meResponseSchema, Role } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { LOCAL_USERS } from '../src/shared/auth/local-users';

describe('LOCAL_USERS', () => {
  it('has the three test users of AUTH_MODE=local, keyed by bearer token', () => {
    expect(Object.keys(LOCAL_USERS)).toEqual([
      'local-inspector',
      'local-inspector-2',
      'local-manager',
    ]);
  });

  it('follows the /me contract, with unique ids and e-mails', () => {
    const users = Object.values(LOCAL_USERS).map((user) => meResponseSchema.parse(user));

    expect(new Set(users.map((user) => user.id)).size).toBe(3);
    expect(new Set(users.map((user) => user.email)).size).toBe(3);
    expect(users.map((user) => user.role)).toEqual([Role.INSPECTOR, Role.INSPECTOR, Role.MANAGER]);
  });
});
