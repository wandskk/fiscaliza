import { cn } from '@/design-system/cn';
import { type ReactNode, type SelectHTMLAttributes, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Select({
  label,
  hint,
  error,
  children,
  className,
  id: externalId,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        aria-describedby={describedBy}
        aria-invalid={!!error || undefined}
        className={cn(
          'h-10 rounded-sm border border-border bg-surface px-3 text-text',
          'focus-visible:outline-2 focus-visible:outline-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger focus-visible:outline-danger',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {hint && !error && (
        <span id={hintId} className="text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
