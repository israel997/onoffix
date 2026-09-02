'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from '@/components/icons/office-icons';

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

// Une erreur mérite plus de temps de lecture qu'une simple confirmation.
const DURATION_MS: Record<ToastTone, number> = { success: 3500, warning: 4500, error: 5500 };

const TONE_STYLE: Record<ToastTone, { border: string; icon: string; Icon: typeof CheckCircleIcon }> = {
  success: { border: 'border-status-validated', icon: 'text-status-validated', Icon: CheckCircleIcon },
  warning: { border: 'border-status-declared', icon: 'text-status-declared', Icon: AlertTriangleIcon },
  error: { border: 'border-status-review', icon: 'text-status-review', Icon: XCircleIcon },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const arm = useCallback(
    (id: number, tone: ToastTone) => {
      const timer = setTimeout(() => dismiss(id), DURATION_MS[tone]);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success', options?: ToastOptions) => {
      const id = nextId++;
      const persistent = options?.persistent ?? false;
      setItems((prev) => [...prev, { id, message, tone, persistent }]);
      if (!persistent) arm(id, tone);
    },
    [arm],
  );

  // Survoler un toast met sa disparition en pause — le temps de le lire tranquillement.
  function pause(id: number) {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }
  function resume(id: number, tone: ToastTone, persistent: boolean) {
    if (!persistent) arm(id, tone);
  }

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {items.map((t) => {
          const { border, icon, Icon } = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id, t.tone, t.persistent)}
              className={`animate-fade-in-up pointer-events-auto flex w-80 items-start gap-2.5 rounded-lg border-l-4 bg-surface px-3.5 py-3 text-sm text-foreground shadow-lg ${border}`}
            >
              <Icon className={`h-4 w-4 shrink-0 translate-y-0.5 ${icon}`} />
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.persistent ? (
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 rounded-md bg-surface-muted px-2 py-1 text-xs font-semibold text-foreground hover:bg-border"
                >
                  Got it
                </button>
              ) : (
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
