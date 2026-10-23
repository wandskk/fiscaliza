import { Role, userFilterSchema, userSummarySchema, type UserSummary } from '@fiscaliza/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { Roles } from '../../../shared/auth/decorators';
import { ListInspectorsUseCase } from '../application/list-inspectors.use-case';

class UserFilterDto extends createZodDto(userFilterSchema) {}
class UserSummaryDto extends createZodDto(userSummarySchema) {}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly listInspectors: ListInspectorsUseCase) {}

  @Get()
  @Roles(Role.MANAGER)
  @ApiOkResponse({ type: [UserSummaryDto] })
  async list(@Query() filter: UserFilterDto): Promise<UserSummary[]> {
    const users = await this.listInspectors.execute(filter);
    return users.map(({ id, name, email }) => ({ id, name, email }));
  }
}
