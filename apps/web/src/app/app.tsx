import { ThemeProvider } from '@/app/theme/theme-provider';

export function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-bg text-text">
        <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
          <h1 className="text-2xl font-bold text-text">Fiscaliza</h1>
          <p className="mt-2 text-muted">Base do Web e Design System instalados com sucesso.</p>
        </div>
      </div>
    </ThemeProvider>
  );
}
