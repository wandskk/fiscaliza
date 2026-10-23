import type { Role } from '@fiscaliza/shared';
import type { User } from '../../domain/user.entity';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  // Creates or updates by id
  save(user: User): Promise<void>;
  // Ordered by name
  listByRole(role: Role): Promise<User[]>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
