import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/features/auth/api/me.api';
import { useSession } from '@/features/auth/hooks/use-session';

export const ME_QUERY_KEY = ['me'] as const;

// Only asks the API once there is a session; a 401 already signs the user out in the HTTP client
export function useMe() {
  const { status } = useSession();
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: ({ signal }) => getMe(signal),
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });
}
