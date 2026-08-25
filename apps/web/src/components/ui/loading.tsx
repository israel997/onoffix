function Footprint({ delay, flip }: { delay: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="animate-footstep h-3 w-3"
      style={{ animationDelay: delay, transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <ellipse cx="12" cy="15.5" rx="5.5" ry="7.5" />
      <circle cx="7.4" cy="4.6" r="1.6" />
      <circle cx="11" cy="2.6" r="1.7" />
      <circle cx="14.8" cy="3.1" r="1.6" />
      <circle cx="17.8" cy="5.3" r="1.3" />
    </svg>
  );
}

/** Indicateur de chargement de la marque : des pas plutôt qu'un spinner générique. */
export function Loading({ label = 'Loading…', className = 'text-sm' }: { label?: string; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-muted-foreground ${className}`}>
      <span className="flex items-end gap-0.5 text-brand-blue">
        <Footprint delay="0s" />
        <Footprint delay="0.35s" flip />
        <Footprint delay="0.7s" />
      </span>
      {label}
    </p>
  );
}
