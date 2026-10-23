import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './theme-provider';
import { useTheme } from './use-theme';

function ThemeDisplay() {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Alternar tema</button>
      <button onClick={() => setTheme('dark')}>Tema escuro</button>
      <button onClick={() => setTheme('light')}>Tema claro</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light when no localStorage and matchMedia returns false for dark', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('fiscaliza-theme', 'dark');
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('toggleTheme switches from light to dark and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('Alternar tema'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem('fiscaliza-theme')).toBe('dark');
  });

  it('setTheme persists the chosen theme', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('Tema escuro'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem('fiscaliza-theme')).toBe('dark');
    await user.click(screen.getByText('Tema claro'));
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(localStorage.getItem('fiscaliza-theme')).toBe('light');
  });

  it('setTheme updates data-theme attribute on <html>', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await user.click(screen.getByText('Tema escuro'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to the system preference when localStorage throws', async () => {
    const user = userEvent.setup();
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme').textContent).toBe('light');
    await user.click(screen.getByText('Tema escuro'));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('useTheme throws when used outside ThemeProvider', () => {
    const consoleError = console.error;
    console.error = () => undefined; // suppress React error boundary output
    expect(() => render(<ThemeDisplay />)).toThrow('useTheme must be used within ThemeProvider');
    console.error = consoleError;
  });
});
