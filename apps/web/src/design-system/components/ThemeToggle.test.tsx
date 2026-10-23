import { ThemeProvider } from '@/app/theme/theme-provider';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('switches the theme and updates its accessible name', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const toggle = screen.getByRole('button', { name: 'Ativar tema escuro' });
    expect(toggle.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(toggle.textContent).toBe('');
    await user.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const back = screen.getByRole('button', { name: 'Ativar tema claro' });
    expect(back.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });
});
