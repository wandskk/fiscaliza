import { ThemeProvider } from '@/app/theme/theme-provider';
import { lazy, Suspense } from 'react';

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/design-system-page').then((m) => ({ default: m.DesignSystemPage })))
  : null;

export function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-bg text-text">
        {import.meta.env.DEV && DesignSystemPage && path === '/design-system' ? (
          <Suspense fallback={<div className="p-8 text-muted">Carregando vitrine...</div>}>
            <DesignSystemPage />
          </Suspense>
        ) : (
          <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
            <h1 className="text-2xl font-bold text-text">Fiscaliza</h1>
            <p className="mt-2 text-muted">Base do Web e Design System instalados com sucesso.</p>
            {import.meta.env.DEV && (
              <a
                href="/design-system"
                className="mt-4 inline-flex items-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90"
              >
                Abrir Vitrine do Design System (/design-system)
              </a>
            )}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
