import { cn } from '@/design-system/cn';
import { type HTMLAttributes, type ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div className={cn('rounded-md border border-border bg-surface p-4', className)} {...rest}>
      {children}
    </div>
  );
}
