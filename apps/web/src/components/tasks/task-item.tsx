'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  assignerTache,
  declarerTache,
  demarrerTache,
  validerTache,
  type Tache,
} from '@/lib/api';

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const STATUT_TONE: Record<Tache['statut'], 'neutral' | 'declared' | 'validated' | 'review' | 'brand'> = {
  A_FAIRE: 'neutral',
  EN_COURS: 'brand',
  DECLARE: 'declared',
  VALIDE: 'validated',
  A_REVOIR: 'review',
};

const STATUT_LABEL: Record<Tache['statut'], string> = {
  A_FAIRE: 'To do',
  EN_COURS: 'In progress',
  DECLARE: 'Waiting for validation',
  VALIDE: 'Validated',
  A_REVOIR: 'Needs rework',
};

function LiveTimer({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{formatDuration(now - new Date(since).getTime())}</span>;
}

export function TaskItem({
  tache,
  currentUserId,
  isManager,
  assignableMembres,
  onChange,
}: {
  tache: Tache;
  currentUserId: string;
  isManager: boolean;
  assignableMembres: { user: { id: string; nom: string } }[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAssignee = tache.assigneAId === currentUserId;
  const isAssigner = tache.assigneParId === currentUserId;
  const canValidate = tache.statut === 'DECLARE' && (isAssigner || isManager);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{tache.titre}</p>
        <Badge tone={STATUT_TONE[tache.statut]}>{STATUT_LABEL[tache.statut]}</Badge>
      </div>
      {tache.description && <p className="mt-1 text-xs text-muted-foreground">{tache.description}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {tache.assigneA ? <span>Assigned to {tache.assigneA.nom}</span> : <span>Unassigned</span>}
        {tache.statut === 'EN_COURS' && tache.dateDebut && (
          <span>
            · running for <LiveTimer since={tache.dateDebut} />
          </span>
        )}
        {tache.statut === 'VALIDE' && tache.dateDebut && tache.dateDeclaration && (
          <span>
            · took {formatDuration(new Date(tache.dateDeclaration).getTime() - new Date(tache.dateDebut).getTime())}
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-status-review">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!tache.assigneAId && isManager && (
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) run(() => assignerTache(tache.id, e.target.value));
            }}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
          >
            <option value="" disabled>
              Assign to…
            </option>
            {assignableMembres.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.nom}
              </option>
            ))}
          </select>
        )}

        {isAssignee && (tache.statut === 'A_FAIRE' || tache.statut === 'A_REVOIR') && (
          <Button size="sm" disabled={busy} onClick={() => run(() => demarrerTache(tache.id))}>
            Start
          </Button>
        )}

        {isAssignee && tache.statut === 'EN_COURS' && (
          <Button size="sm" disabled={busy} onClick={() => run(() => declarerTache(tache.id))}>
            Mark as done
          </Button>
        )}

        {canValidate && (
          <>
            <Button size="sm" disabled={busy} onClick={() => run(() => validerTache(tache.id, 'ok'))}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => validerTache(tache.id, 'litige'))}
            >
              Send back
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
