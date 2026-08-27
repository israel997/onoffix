'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in-up pointer-events-auto rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
              t.tone === 'success' ? 'bg-status-validated' : t.tone === 'warning' ? 'bg-status-declared' : 'bg-status-review'
            }`}
          >
            {t.message}
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
