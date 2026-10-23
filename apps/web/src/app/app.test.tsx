import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('sends a visitor without session to the sign-in page', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Fiscaliza' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/sign-in');
  });
});
