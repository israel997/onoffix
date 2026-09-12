'use client';

import { BLOCK_HEADING_MAX_LENGTH, BLOCK_TEXT_MAX_LENGTH, type ContentBlock } from './report-content';

export function BlockEditor({
  blocks,
  onChange,
  editing,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  editing: boolean;
}) {
  if (!editing) {
    if (blocks.length === 0) return <p className="text-sm text-muted-foreground">No content yet.</p>;
    return (
      <div className="flex flex-col gap-2">
        {blocks.map((b, i) => {
          if (b.type === 'heading') return <h2 key={i} className="text-lg font-bold text-foreground">{b.content}</h2>;
          if (b.type === 'subheading') return <h3 key={i} className="text-sm font-semibold text-foreground">{b.content}</h3>;
          return <p key={i} className="whitespace-pre-wrap text-sm text-foreground">{b.content}</p>;
        })}
      </div>
    );
  }

  function update(i: number, content: string) {
    const next = [...blocks];
    next[i] = { ...next[i], content };
    onChange(next);
  }

  function remove(i: number) {
    onChange(blocks.filter((_, idx) => idx !== i));
  }

  function add(type: ContentBlock['type']) {
    onChange([...blocks, { type, content: '' }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          {b.type === 'text' ? (
            <textarea
              value={b.content}
              maxLength={BLOCK_TEXT_MAX_LENGTH}
              onChange={(e) => update(i, e.target.value)}
              rows={3}
              placeholder="Paragraph…"
              className="min-h-[4.5rem] w-full max-h-60 resize-y overflow-y-auto rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          ) : (
            <input
              value={b.content}
              maxLength={BLOCK_HEADING_MAX_LENGTH}
              onChange={(e) => update(i, e.target.value)}
              placeholder={b.type === 'heading' ? 'Heading…' : 'Subheading…'}
              className={`h-10 w-full rounded-lg border border-border bg-surface px-3 outline-none focus:border-brand-blue ${
                b.type === 'heading' ? 'text-base font-bold' : 'text-sm font-semibold'
              }`}
            />
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Remove block"
            className="mt-2 shrink-0 text-xs text-muted-foreground hover:text-status-review"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-3 text-xs font-medium text-brand-blue">
        <button type="button" onClick={() => add('heading')} className="hover:underline">
          + Heading
        </button>
        <button type="button" onClick={() => add('subheading')} className="hover:underline">
          + Subheading
        </button>
        <button type="button" onClick={() => add('text')} className="hover:underline">
          + Text
        </button>
      </div>
    </div>
  );
}
