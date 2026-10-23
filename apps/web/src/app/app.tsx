import { BrowserRouter } from 'react-router-dom';
import { Providers } from '@/app/providers';
import { AppRoutes } from '@/app/router';

export function App() {
  return (
    <BrowserRouter>
      <Providers>
        <div className="min-h-screen bg-bg text-text">
          <AppRoutes />
        </div>
      </Providers>
    </BrowserRouter>
  );
}
