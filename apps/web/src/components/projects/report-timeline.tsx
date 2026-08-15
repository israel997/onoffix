'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { RapportProjet } from '@/lib/api';

const EVENT_LABEL: Record<string, string> = {
  TACHE_CREEE: 'Created',
  TACHE_DEMARREE: 'Started',
  TACHE_DECLAREE: 'Marked done',
  TACHE_VALIDEE: 'Validated',
  BLOCAGE_OUVERT: 'Blocker opened',
  BLOCAGE_RESOLU: 'Blocker resolved',
};

const REPLAY_DELAY_MS = 700;

export function ReportTimeline({ rapport, bureauId }: { rapport: RapportProjet; bureauId: string }) {
  const { timeline, evolutionEquipe } = rapport;
  const [index, setIndex] = useState(Math.max(0, timeline.length - 1));
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || index >= timeline.length - 1) return;
    const timer = setTimeout(() => {
      setIndex((i) => {
        const next = Math.min(i + 1, timeline.length - 1);
        if (next >= timeline.length - 1) setPlaying(false);
        return next;
      });
    }, REPLAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index, timeline.length]);

  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  const day = timeline[index];
  const snapshot = evolutionEquipe[index];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={index === 0}
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          ← Prev
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={index === timeline.length - 1}
          onClick={() => {
            setPlaying(false);
            setIndex((i) => Math.min(timeline.length - 1, i + 1));
          }}
        >
          Next →
        </Button>
        <input
          type="range"
          min={0}
          max={timeline.length - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            setIndex(Number(e.target.value));
          }}
          className="min-w-[120px] flex-1"
        />
        <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{day.date}</span>
      </div>

      {snapshot && (
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface-muted p-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{snapshot.tachesValidees}</p>
            <p className="text-xs text-muted-foreground">Validated so far</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{snapshot.tachesDemarrees}</p>
            <p className="text-xs text-muted-foreground">Started so far</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{snapshot.blocagesActifs}</p>
            <p className="text-xs text-muted-foreground">Active blockers</p>
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border">
        {day.evenements.map((e, i) => (
          <Link
            key={`${e.tacheId}-${e.type}-${i}`}
            href={`/offices/${bureauId}/tasks`}
            className="flex flex-col gap-0.5 py-2 text-sm hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-foreground">
              {EVENT_LABEL[e.type] ?? e.type} — {e.titre}
            </span>
            {e.detail && <span className="text-xs text-muted-foreground">{e.detail}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
