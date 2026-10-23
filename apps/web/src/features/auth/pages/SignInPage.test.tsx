import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { SignInPage } from '@/features/auth/pages/SignInPage';
import { renderWithProviders } from '@/features/auth/test-utils';
import { AuthError, type AuthBackend } from '@/features/auth/utils/auth-backend';
import { createLocalAuthBackend } from '@/features/auth/utils/local-auth-backend';

function renderPage(backend?: AuthBackend) {
  return renderWithProviders(
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>,
    { route: '/sign-in', backend },
  );
}

describe('SignInPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('signs in with a test user and leaves the sign-in route', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(await screen.findByLabelText('Usuário de teste'), 'local-inspector');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('home')).toBeInTheDocument();
    expect(sessionStorage.getItem('fiscaliza-local-token')).toBe('local-inspector');
  });

  it('shows the credential error in the form and stays on the page', async () => {
    const failing: AuthBackend = {
      ...createLocalAuthBackend(),
      signIn: () =>
        Promise.reject(new AuthError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')),
    };
    const user = userEvent.setup();
    renderPage(failing);

    await user.selectOptions(await screen.findByLabelText('Usuário de teste'), 'local-manager');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.queryByText('home')).not.toBeInTheDocument();
  });

  it('uses a generic message for unexpected failures', async () => {
    const failing: AuthBackend = {
      ...createLocalAuthBackend(),
      signIn: () => Promise.reject(new Error('boom')),
    };
    const user = userEvent.setup();
    renderPage(failing);

    await user.selectOptions(await screen.findByLabelText('Usuário de teste'), 'local-manager');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar agora');
  });

  it('sends an already signed in user away from the sign-in page', async () => {
    sessionStorage.setItem('fiscaliza-local-token', 'local-manager');
    renderPage();

    expect(await screen.findByText('home')).toBeInTheDocument();
  });
});
