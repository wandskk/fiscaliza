import type { Role } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

export interface SyncUserCommand {
  id: string;
  email: string;
  name?: string;
  role: Role;
}

// Runs only on GET /me: the other use cases trust the id and role of the access token
@Injectable()
export class SyncUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(command: SyncUserCommand): Promise<User> {
    const existing = await this.users.findById(command.id);
    if (!existing) {
      const user = User.create(command);
      await this.users.save(user);
      return user;
    }
    if (existing.changeRole(command.role)) await this.users.save(existing);
    return existing;
  }
}
