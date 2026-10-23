import { Role } from '@fiscaliza/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { SyncUserUseCase } from '../src/modules/auth/application/sync-user.use-case';
import { InMemoryUserRepository } from './support/in-memory-user.repository';

describe('SyncUserUseCase', () => {
  const command = {
    id: 'sub-1',
    email: 'maria@prefeitura.gov.br',
    name: 'Maria',
    role: Role.INSPECTOR,
  };
  let users: InMemoryUserRepository;
  let syncUser: SyncUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    syncUser = new SyncUserUseCase(users);
  });

  it('creates the user on the first access', async () => {
    const user = await syncUser.execute(command);

    expect(user.toProps()).toEqual(command);
    expect(users.users.get('sub-1')?.toProps()).toEqual(command);
  });

  it('only reads on the next accesses', async () => {
    await syncUser.execute(command);
    const user = await syncUser.execute({ ...command, name: 'Maria Silva' });

    expect(users.saves).toBe(1);
    expect(user.name).toBe('Maria');
  });

  it('updates the role when the Cognito group changed', async () => {
    await syncUser.execute(command);
    const user = await syncUser.execute({ ...command, role: Role.MANAGER });

    expect(user.role).toBe(Role.MANAGER);
    expect(users.users.get('sub-1')?.role).toBe(Role.MANAGER);
    expect(users.saves).toBe(2);
  });
});
