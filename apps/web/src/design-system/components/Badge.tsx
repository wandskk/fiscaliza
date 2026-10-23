import { cn } from '@/design-system/cn';
import { type ReactNode } from 'react';

export type BadgeTone = 'info' | 'warning' | 'success' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  info: 'bg-info/10 text-info border border-info/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  success: 'bg-success/10 text-success border border-success/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
};

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
