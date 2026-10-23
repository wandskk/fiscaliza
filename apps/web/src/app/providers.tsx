import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/app/theme/theme-provider';
import { ToastContainer } from '@/design-system';
import { SessionProvider } from '@/features/auth/components/session-provider';
import { createQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ToastContainer>{children}</ToastContainer>
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
