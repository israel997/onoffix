'use client';

import { LIST_ITEM_MAX_LENGTH, LIST_MAX_ITEMS } from './report-content';

type Tone = 'positive' | 'negative' | 'neutral';

const TONE_COLOR: Record<Tone, string> = {
  positive: 'text-status-validated',
  negative: 'text-status-review',
  neutral: 'text-brand-blue',
};

function ToneIcon({ tone, className }: { tone: Tone; className?: string }) {
  if (tone === 'positive') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M5 12.5l4 4L19 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === 'negative') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

export function BulletListEditor({
  items,
  onChange,
  editing,
  tone,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  editing: boolean;
  tone: Tone;
  placeholder?: string;
}) {
  if (!editing) {
    if (items.length === 0) return <p className="text-xs text-muted-foreground">—</p>;
    return (
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
            <ToneIcon tone={tone} className={`mt-0.5 h-3 w-3 shrink-0 ${TONE_COLOR[tone]}`} />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  function update(i: number, value: string) {
    const next = [...items];
    next[i] = value.slice(0, LIST_ITEM_MAX_LENGTH);
    onChange(next);
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <ToneIcon tone={tone} className={`h-3.5 w-3.5 shrink-0 ${TONE_COLOR[tone]}`} />
          <input
            value={item}
            maxLength={LIST_ITEM_MAX_LENGTH}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="h-7 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-xs outline-none focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Remove"
            className="shrink-0 text-xs text-muted-foreground hover:text-status-review"
          >
            ✕
          </button>
        </div>
      ))}
      {items.length < LIST_MAX_ITEMS && (
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="self-start text-xs font-medium text-brand-blue hover:underline"
        >
          + Add
        </button>
      )}
    </div>
  );
}
