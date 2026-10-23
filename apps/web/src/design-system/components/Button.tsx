import { cn } from '@/design-system/cn';
import { type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-fg hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary',
  secondary:
    'bg-surface text-text border border-border hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary',
  ghost: 'text-text hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary',
  danger: 'bg-danger text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-danger',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  onClick,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <svg
          aria-hidden="true"
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M8 2a6 6 0 0 1 6 6h-2A4 4 0 0 0 8 4V2Z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
