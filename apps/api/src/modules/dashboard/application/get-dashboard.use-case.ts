import type { Dashboard } from '@fiscaliza/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_QUERY, type DashboardQuery } from './ports/dashboard.query';

@Injectable()
export class GetDashboardUseCase {
  constructor(@Inject(DASHBOARD_QUERY) private readonly query: DashboardQuery) {}

  execute(): Promise<Dashboard> {
    return this.query.summary();
  }
}
