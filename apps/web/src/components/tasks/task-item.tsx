'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  accepterTache,
  assignerTache,
  declarerTache,
  demarrerTache,
  updateTache,
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
  ACCEPTEE: 'brand',
  EN_COURS: 'brand',
  DECLARE: 'declared',
  VALIDE: 'validated',
  A_REVOIR: 'review',
};

const STATUT_LABEL: Record<Tache['statut'], string> = {
  A_FAIRE: 'To do',
  ACCEPTEE: 'Accepted',
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
  const [editing, setEditing] = useState(false);
  const [titre, setTitre] = useState(tache.titre);
  const [description, setDescription] = useState(tache.description ?? '');
  const [dateCible, setDateCible] = useState(tache.dateCible ?? '');

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

  async function handleSaveEdit() {
    await run(() =>
      updateTache(tache.id, { titre, description: description || undefined, dateCible: dateCible || null }),
    );
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border p-3">
        <div className="flex flex-col gap-2">
          <Label>
            Title
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </Label>
          <Label>
            Description
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Label>
          <Label>
            Target date (daily ritual)
            <Input type="date" value={dateCible} onChange={(e) => setDateCible(e.target.value)} />
          </Label>
          {error && <p className="text-xs text-status-review">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={handleSaveEdit}>
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setTitre(tache.titre);
                setDescription(tache.description ?? '');
                setDateCible(tache.dateCible ?? '');
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{tache.titre}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={STATUT_TONE[tache.statut]}>{STATUT_LABEL[tache.statut]}</Badge>
          {isManager && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </div>
      {tache.description && <p className="mt-1 text-xs text-muted-foreground">{tache.description}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {tache.assigneA ? <span>Assigned to {tache.assigneA.nom}</span> : <span>Unassigned</span>}
        {tache.dateCible && <span>· due {tache.dateCible}</span>}
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

        {isAssignee && tache.statut === 'A_FAIRE' && (
          <Button size="sm" disabled={busy} onClick={() => run(() => accepterTache(tache.id))}>
            Accept
          </Button>
        )}

        {isAssignee && (tache.statut === 'ACCEPTEE' || tache.statut === 'A_REVOIR') && (
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
