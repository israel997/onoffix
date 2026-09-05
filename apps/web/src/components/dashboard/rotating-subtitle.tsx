'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/** Fait alterner une ligne de texte parmi plusieurs, même animation douce que les modales/toasts. */
export function RotatingSubtitle({
  lines,
  intervalMs = 4500,
  className,
}: {
  lines: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lines.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % lines.length), intervalMs);
    return () => clearInterval(id);
  }, [lines.length, intervalMs]);

  return (
    <p key={index} className={cn('animate-fade-in-up', className)}>
      {lines[index]}
    </p>
  );
}
