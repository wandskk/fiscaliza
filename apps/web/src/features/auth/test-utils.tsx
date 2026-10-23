import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/app/theme/theme-provider';
import { SessionProvider } from '@/features/auth/components/session-provider';
import type { AuthBackend } from '@/features/auth/utils/auth-backend';
import { createLocalAuthBackend } from '@/features/auth/utils/local-auth-backend';

interface RenderOptions {
  route?: string;
  backend?: AuthBackend;
}

// Full provider stack with the real local backend (sessionStorage) and a query client without retries
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const backend = options.backend ?? createLocalAuthBackend();
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider backend={backend}>
          <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
