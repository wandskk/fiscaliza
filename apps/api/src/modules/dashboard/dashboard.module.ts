import { Module } from '@nestjs/common';
import { GetDashboardUseCase } from './application/get-dashboard.use-case';
import { DASHBOARD_QUERY } from './application/ports/dashboard.query';
import { PrismaDashboardQuery } from './infrastructure/prisma-dashboard.query';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  controllers: [DashboardController],
  providers: [GetDashboardUseCase, { provide: DASHBOARD_QUERY, useClass: PrismaDashboardQuery }],
})
export class DashboardModule {}
