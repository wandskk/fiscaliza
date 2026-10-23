import { Role, type Dashboard } from '@fiscaliza/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/auth/decorators';
import { GetDashboardUseCase } from '../application/get-dashboard.use-case';
import { DashboardDto } from './dashboard.dtos';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboard: GetDashboardUseCase) {}

  @Get()
  @Roles(Role.MANAGER)
  @ApiOkResponse({ type: DashboardDto })
  get(): Promise<Dashboard> {
    return this.getDashboard.execute();
  }
}
