import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/features/dashboard/api/dashboard.api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

// Default refetchOnWindowFocus keeps the numbers fresh when the manager comes back to the tab
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: ({ signal }) => getDashboard(signal),
  });
}
