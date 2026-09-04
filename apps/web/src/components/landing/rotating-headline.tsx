'use client';

import { useEffect, useState } from 'react';

export interface HeroHeadline {
  before: string;
  emphasis: string;
  after: string;
}

/** Fait alterner l'accroche du hero entre plusieurs titres, en gardant le même style que l'ancien h1 statique. */
export function RotatingHeadline({
  headlines,
  intervalMs = 4500,
}: {
  headlines: HeroHeadline[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (headlines.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % headlines.length), intervalMs);
    return () => clearInterval(id);
  }, [headlines.length, intervalMs]);

  const current = headlines[index];

  return (
    <h1>
      <span key={index} className="hero-headline-fade">
        {current.before}
        <span className="u">{current.emphasis}</span>
        {current.after}
      </span>
    </h1>
  );
}
