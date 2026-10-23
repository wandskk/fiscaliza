import * as RadixToast from '@radix-ui/react-toast';
import { cn } from '@/design-system/cn';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// ─── Radix re-exports ────────────────────────────────────────────────────────
export const ToastProvider = RadixToast.Provider;
export const ToastTitle = RadixToast.Title;
export const ToastDescription = RadixToast.Description;

export function ToastViewport({ className }: { className?: string }) {
  return (
    <RadixToast.Viewport
      className={cn('fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2', className)}
    />
  );
}

export type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

// ─── useToast context ────────────────────────────────────────────────────────
interface ToastContextValue {
  showToast: (variant: ToastVariant, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastContainer');
  return ctx;
}

// ─── Toast component ─────────────────────────────────────────────────────────
interface ToastComponentProps {
  item: ToastItem;
  onClose: (id: string) => void;
}

function ToastComponent({ item, onClose }: ToastComponentProps) {
  const { variant, title, description, id } = item;

  return (
    <RadixToast.Root
      // success: polite (role="status"); error: assertive (role="alert")
      type={variant === 'error' ? 'foreground' : 'background'}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      onOpenChange={(open) => {
        if (!open) onClose(id);
      }}
      className={cn(
        'rounded-md border p-4 shadow-lg',
        variant === 'success'
          ? 'border-success/20 bg-surface text-success'
          : 'border-danger/20 bg-surface text-danger',
      )}
    >
      <RadixToast.Title className="font-medium">{title}</RadixToast.Title>
      {description && (
        <RadixToast.Description className="mt-1 text-sm text-muted">
          {description}
        </RadixToast.Description>
      )}
      <RadixToast.Close
        aria-label="Fechar notificação"
        className="absolute right-2 top-2 text-muted hover:text-text"
      >
        ✕
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

// ─── ToastContainer (provider + renderer) ────────────────────────────────────
interface ToastContainerProps {
  children: ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((variant: ToastVariant, title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, variant, title, description }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastProvider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((item) => (
          <ToastComponent key={item.id} item={item} onClose={removeToast} />
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}
