import type { Role } from '@fiscaliza/shared';
import type { UserRepository } from '../../src/modules/auth/application/ports/user.repository';
import { User } from '../../src/modules/auth/domain/user.entity';

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();
  saves = 0;

  findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return Promise.resolve(user ? User.restore(user.toProps()) : null);
  }

  save(user: User): Promise<void> {
    this.saves += 1;
    this.users.set(user.id, User.restore(user.toProps()));
    return Promise.resolve();
  }

  listByRole(role: Role): Promise<User[]> {
    const users = [...this.users.values()]
      .filter((user) => user.role === role)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user) => User.restore(user.toProps()));
    return Promise.resolve(users);
  }
}
