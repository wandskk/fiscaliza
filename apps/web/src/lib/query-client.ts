import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http';

// 4xx answers are final (retrying a 403 or 422 changes nothing); network and 5xx get one more try
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}
