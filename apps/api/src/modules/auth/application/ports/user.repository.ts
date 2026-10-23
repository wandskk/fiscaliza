import type { User } from '../../domain/user.entity';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  // Creates or updates by id
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
