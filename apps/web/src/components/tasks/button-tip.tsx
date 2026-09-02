'use client';

import { useState, type ReactNode } from 'react';

const SEEN_PREFIX = 'ooffix_onboard_seen_';

export function hasSeenTip(key: string) {
  if (typeof window === 'undefined') return true;
  return !!localStorage.getItem(SEEN_PREFIX + key);
}

function markTipSeen(key: string) {
  localStorage.setItem(SEEN_PREFIX + key, '1');
}

/**
 * Mini bulle d'onboarding pointée sur un bouton d'action — une seule fois pour toujours
 * (mémorisée par type de bouton, pas par tâche : chaque bouton n'explique qu'une fois).
 */
export function ButtonTip({
  tipKey,
  text,
  active,
  children,
}: {
  tipKey: string;
  text: string;
  /** Ce bouton est-il celui à mettre en avant en ce moment (un seul à la fois par carte). */
  active: boolean;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);
  const show = active && !dismissed && !hasSeenTip(tipKey);

  return (
    <div className="relative inline-block">
      {children}
      {show && (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-44 -translate-x-1/2">
          <div className="relative rounded-lg bg-brand-blue px-3 py-2 text-xs font-medium text-white shadow-lg">
            <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-brand-blue" />
            <div className="flex items-start gap-2">
              <span>{text}</span>
              <button
                onClick={() => {
                  markTipSeen(tipKey);
                  setDismissed(true);
                }}
                aria-label="Dismiss"
                className="shrink-0 leading-none text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
