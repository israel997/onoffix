'use client';

import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Fait alterner un contenu parmi plusieurs, même animation douce que les modales/toasts.
 * Une seule entrée dans `lines` = pas de rotation (utile pour réutiliser le même composant
 * pour une ligne qui doit rester statique, sans code séparé).
 */
export function RotatingSubtitle({
  lines,
  intervalMs = 4500,
  className,
  as: Tag = 'p',
}: {
  lines: ReactNode[];
  intervalMs?: number;
  className?: string;
  as?: ElementType;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lines.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % lines.length), intervalMs);
    return () => clearInterval(id);
  }, [lines.length, intervalMs]);

  return (
    <Tag key={index} className={cn('animate-fade-in-up', className)}>
      {lines[index]}
    </Tag>
  );
}
