import { Role } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { ListInspectorsUseCase } from '../src/modules/auth/application/list-inspectors.use-case';
import { User } from '../src/modules/auth/domain/user.entity';
import { InMemoryUserRepository } from './support/in-memory-user.repository';

describe('ListInspectorsUseCase', () => {
  it('lists only inspectors, by name', async () => {
    const users = new InMemoryUserRepository();
    const make = (id: string, name: string, role: Role) =>
      users.save(User.create({ id, name, email: `${id}@fiscaliza.dev`, role }));
    await make('b', 'Beto', Role.INSPECTOR);
    await make('m', 'Marta', Role.MANAGER);
    await make('a', 'Ana', Role.INSPECTOR);

    const inspectors = await new ListInspectorsUseCase(users).execute({ role: Role.INSPECTOR });

    expect(inspectors.map((user) => user.name)).toEqual(['Ana', 'Beto']);
  });
});
