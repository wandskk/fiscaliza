import type { Dashboard } from '@fiscaliza/shared';

export const DASHBOARD_QUERY = Symbol('DASHBOARD_QUERY');

// Read-only view for the manager: no entity behind it, just the numbers
export interface DashboardQuery {
  summary(): Promise<Dashboard>;
}
