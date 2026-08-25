'use client';

import type { ReactNode } from 'react';

export function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="animate-slide-in-right h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
