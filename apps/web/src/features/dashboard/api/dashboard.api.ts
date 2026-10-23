import { dashboardSchema, type Dashboard } from '@fiscaliza/shared';
import { http } from '@/lib/http';

export function getDashboard(signal?: AbortSignal): Promise<Dashboard> {
  return http.get('/dashboard', dashboardSchema, signal);
}
