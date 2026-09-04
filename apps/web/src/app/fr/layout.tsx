'use client';

import { useEffect, type ReactNode } from 'react';

/** Bascule l'attribut lang du document tant qu'on est sous /fr, sans toucher au root layout partagé. */
export default function FrLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = 'fr';
    return () => {
      document.documentElement.lang = previous;
    };
  }, []);

  return children;
}
