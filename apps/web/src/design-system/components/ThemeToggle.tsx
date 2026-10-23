import { useTheme } from '@/app/theme/use-theme';
import { cn } from '@/design-system/cn';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'rounded-sm p-2 text-muted transition-colors hover:text-text focus-visible:outline-2',
        className,
      )}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
