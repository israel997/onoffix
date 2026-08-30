'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  persistent: boolean;
}

interface ToastOptions {
  /** Reste affiché jusqu'à un clic explicite sur "Got it" au lieu de disparaître seul
   * après quelques secondes — pour une alerte qu'on ne doit pas pouvoir manquer. */
  persistent?: boolean;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success', options?: ToastOptions) => {
      const id = nextId++;
      const persistent = options?.persistent ?? false;
      setItems((prev) => [...prev, { id, message, tone, persistent }]);
      if (!persistent) {
        setTimeout(() => dismiss(id), 3500);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in-up pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              t.tone === 'success' ? 'bg-status-validated' : t.tone === 'warning' ? 'bg-status-declared' : 'bg-status-review'
            }`}
          >
            <span>{t.message}</span>
            {t.persistent && (
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25"
              >
                Got it
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
