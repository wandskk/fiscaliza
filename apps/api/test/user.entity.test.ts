import { Role } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { CognitoGroup, roleFromGroups, User } from '../src/modules/auth/domain/user.entity';

describe('roleFromGroups', () => {
  it('maps the inspector group to INSPECTOR and the manager group to MANAGER', () => {
    expect(roleFromGroups([CognitoGroup.INSPECTOR])).toBe(Role.INSPECTOR);
    expect(roleFromGroups([CognitoGroup.MANAGER])).toBe(Role.MANAGER);
  });

  it('gives MANAGER to someone in both groups', () => {
    expect(roleFromGroups(['inspector', 'manager'])).toBe(Role.MANAGER);
  });

  it('gives no role outside the two groups', () => {
    expect(roleFromGroups([])).toBeUndefined();
    expect(roleFromGroups(['admin', 'Inspector'])).toBeUndefined();
  });
});

describe('User', () => {
  const data = { id: 'sub-1', email: 'maria@prefeitura.gov.br', role: Role.INSPECTOR };

  it('uses the e-mail as name when the token has no name', () => {
    expect(User.create(data).name).toBe('maria@prefeitura.gov.br');
    expect(User.create({ ...data, name: 'Maria' }).name).toBe('Maria');
  });

  it('changes the role and tells whether anything changed', () => {
    const user = User.create(data);

    expect(user.changeRole(Role.INSPECTOR)).toBe(false);
    expect(user.changeRole(Role.MANAGER)).toBe(true);
    expect(user.role).toBe(Role.MANAGER);
  });
});
