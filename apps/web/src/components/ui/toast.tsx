'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}
interface ToastApi {
  success: (m: string) => void;
  error: (m: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: ToastItem['kind'], message: string) => {
      const id = ++counter;
      setItems((l) => [...l.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              data-testid={`toast-${t.kind}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border bg-surface p-3 text-sm shadow-lg',
                t.kind === 'error' ? 'border-danger' : 'border-st-present',
              )}
            >
              {t.kind === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-st-present" aria-hidden />}
              <p className="flex-1">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" data-testid={`toast-dismiss-${t.id}`}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
