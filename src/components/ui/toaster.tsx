'use client';

import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-slide-up',
            toast.variant === 'destructive'
              ? 'border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
              : toast.variant === 'success'
              ? 'border-[var(--color-win)]/30 bg-[var(--color-win)]/10 text-[var(--color-win)]'
              : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)]'
          )}
        >
          {toast.variant === 'success' && <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />}
          {toast.variant === 'destructive' && <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
          {(!toast.variant || toast.variant === 'default') && <Info className="h-5 w-5 shrink-0 mt-0.5 text-[var(--color-primary)]" />}
          <div className="flex-1 min-w-0">
            {toast.title && <p className="font-semibold text-sm">{toast.title}</p>}
            {toast.description && <p className="text-xs mt-0.5 opacity-80">{toast.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
