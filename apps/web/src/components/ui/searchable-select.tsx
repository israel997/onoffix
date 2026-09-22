'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronIcon } from '@/components/icons/office-icons';
import { cn } from '@/lib/cn';

export interface SearchableOption {
  value: string;
  label: string;
}

/** Petit menu déroulant avec filtre — un `<select>` natif ne tient pas quand il y a
 * beaucoup d'options (ex. déplacer une tâche vers l'un de 20 subjects).
 *
 * Sans `value` : bouton d'action compact qui garde son `placeholder` fixe (assigner,
 * déplacer, mentionner…). Avec `value` : se comporte comme un vrai champ de
 * formulaire — le bouton affiche l'option choisie et prend `size="md"` pour matcher
 * la largeur/hauteur d'un `<select>` natif. */
export function SearchableSelect({
  options,
  value,
  onSelect,
  placeholder,
  disabled,
  className,
  size = 'sm',
}: {
  options: SearchableOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
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
  const selectedLabel = value !== undefined ? options.find((o) => o.value === value)?.label : undefined;

  return (
    <div ref={rootRef} className={cn('relative', size === 'md' && 'w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'rounded-lg border border-border bg-surface disabled:opacity-50',
          size === 'md'
            ? 'flex h-10 w-full items-center justify-between gap-2 px-3 text-sm text-foreground'
            : 'h-7 px-2 text-xs text-muted-foreground hover:text-foreground',
        )}
      >
        <span className={cn(size === 'md' && 'truncate text-left', !selectedLabel && 'text-muted-foreground')}>
          {selectedLabel ?? placeholder}
        </span>
        {size === 'md' && <ChevronIcon className="h-3 w-3 shrink-0 rotate-90 text-muted-foreground" />}
      </button>
      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-30 mt-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg',
            size === 'md' ? 'w-full' : 'w-48',
          )}
        >
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
                  className={cn(
                    'block w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-surface-muted',
                    o.value === value ? 'font-medium text-brand-blue' : 'text-foreground',
                  )}
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
