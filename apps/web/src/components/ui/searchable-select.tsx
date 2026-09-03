'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface SearchableOption {
  value: string;
  label: string;
}

/** Petit menu déroulant avec filtre — un `<select>` natif ne tient pas quand il y a
 * beaucoup d'options (ex. déplacer une tâche vers l'un de 20 subjects). */
export function SearchableSelect({
  options,
  onSelect,
  placeholder,
  disabled,
  className,
}: {
  options: SearchableOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="h-7 rounded-lg border border-border bg-surface px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {placeholder}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="mb-1 h-7 w-full rounded-md border border-border bg-surface px-2 text-xs"
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No match.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onSelect(o.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-muted"
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
