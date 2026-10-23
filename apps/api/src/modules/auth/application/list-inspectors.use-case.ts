import type { UserFilter } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { User } from '../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from './ports/user.repository';

// Feeds the inspector picker of a site; only users who opened /me at least once appear.
// The filter accepts only role=INSPECTOR today (userFilterSchema)
@Injectable()
export class ListInspectorsUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  execute(filter: UserFilter): Promise<User[]> {
    return this.users.listByRole(filter.role);
  }
}
