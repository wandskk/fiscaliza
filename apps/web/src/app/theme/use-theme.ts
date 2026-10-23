import { useContext } from 'react';
import { ThemeContext, type Theme } from './theme-provider';

export type { Theme };

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
