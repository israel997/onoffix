'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import {
  accepterTache,
  assignerTache,
  declarerTache,
  deleteTache,
  demarrerTache,
  updateTache,
  validerTache,
  type Tache,
} from '@/lib/api';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

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

const STATUT_PROGRESS: Record<Tache['statut'], number> = {
  A_FAIRE: 0,
  ACCEPTEE: 20,
  EN_COURS: 50,
  A_REVOIR: 60,
  DECLARE: 80,
  VALIDE: 100,
};

const SANTE_TONE: Record<Tache['sante'], 'neutral' | 'declared' | 'validated' | 'review' | 'brand'> = {
  NORMAL: 'neutral',
  A_SURVEILLER: 'declared',
  A_RISQUE: 'review',
  BLOQUEE: 'review',
};

const SANTE_LABEL: Record<Tache['sante'], string> = {
  NORMAL: 'Normal',
  A_SURVEILLER: 'Watch',
  A_RISQUE: 'At risk',
  BLOQUEE: 'Blocked',
};

const PRIORITE_TONE: Record<Tache['priorite'], 'neutral' | 'declared' | 'validated' | 'review' | 'brand'> = {
  BASSE: 'neutral',
  NORMALE: 'neutral',
  HAUTE: 'declared',
  URGENTE: 'review',
};

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

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
  isAdmin = false,
  assignableMembres,
  onChange,
}: {
  tache: Tache;
  currentUserId: string;
  isManager: boolean;
  isAdmin?: boolean;
  assignableMembres: { user: { id: string; nom: string } }[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [titre, setTitre] = useState(tache.titre);
  const [description, setDescription] = useState(tache.description ?? '');
  const [dateCible, setDateCible] = useState(tache.dateCible ?? '');

  const isAssignee = tache.assigneAId === currentUserId;
  const isAssigner = tache.assigneParId === currentUserId;
  const canValidate = tache.statut === 'DECLARE' && (isAssigner || isManager);
  const canDeleteTask = isAdmin;
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChange();
      if (successMessage) toast(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    await run(
      () => updateTache(tache.id, { titre, description: description || undefined, dateCible: dateCible || null }),
      'Task updated',
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
        <button
          className="text-left text-sm font-medium text-foreground hover:underline"
          onClick={() => setShowDetail(true)}
        >
          {tache.titre}
        </button>
        <div className="relative flex shrink-0 items-center gap-2">
          <Badge tone={STATUT_TONE[tache.statut]}>{STATUT_LABEL[tache.statut]}</Badge>
          {tache.sante !== 'NORMAL' && <Badge tone={SANTE_TONE[tache.sante]}>{SANTE_LABEL[tache.sante]}</Badge>}
          {(isManager || canDeleteTask) && (
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More actions"
              className="rounded px-1 text-muted-foreground hover:text-foreground"
            >
              ⋯
            </button>
          )}
          {menuOpen && (
            <div className="animate-fade-in-up absolute right-0 top-6 z-10 flex w-32 flex-col rounded-lg border border-border bg-surface py-1 text-xs shadow-md">
              {isManager && (
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-left hover:bg-surface-muted"
                >
                  Edit
                </button>
              )}
              {canDeleteTask && (
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    const ok = await confirmDialog({
                      title: `Delete "${tache.titre}"?`,
                      description: 'This cannot be undone.',
                      confirmLabel: 'Delete',
                      danger: true,
                    });
                    if (ok) run(() => deleteTache(tache.id), 'Task deleted');
                  }}
                  className="px-3 py-1.5 text-left text-status-review hover:bg-surface-muted"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {tache.description && <p className="mt-1 text-xs text-muted-foreground">{tache.description}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {tache.assigneA ? <span>Assigned to {tache.assigneA.nom}</span> : <span>Unassigned</span>}
        {tache.priorite !== 'NORMALE' && (
          <Badge tone={PRIORITE_TONE[tache.priorite]}>{tache.priorite}</Badge>
        )}
        {tache.conversation && <Badge tone="brand">{tache.conversation.nom}</Badge>}
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
      <ProgressBar percent={STATUT_PROGRESS[tache.statut]} />

      {error && <p className="mt-2 text-xs text-status-review">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!tache.assigneAId && isManager && (
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) run(() => assignerTache(tache.id, e.target.value), 'Task assigned');
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
          <Button size="sm" disabled={busy} onClick={() => run(() => accepterTache(tache.id), 'Task accepted')}>
            Accept
          </Button>
        )}

        {isAssignee && (tache.statut === 'ACCEPTEE' || tache.statut === 'A_REVOIR') && (
          <Button size="sm" disabled={busy} onClick={() => run(() => demarrerTache(tache.id), 'Task started')}>
            Start
          </Button>
        )}

        {isAssignee && tache.statut === 'EN_COURS' && (
          <Button size="sm" disabled={busy} onClick={() => run(() => declarerTache(tache.id), 'Marked as done')}>
            Mark as done
          </Button>
        )}

        {canValidate && (
          <>
            <Button size="sm" disabled={busy} onClick={() => run(() => validerTache(tache.id, 'ok'), 'Task approved')}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => validerTache(tache.id, 'litige'), 'Sent back for rework')}
            >
              Send back
            </Button>
          </>
        )}
      </div>

      {showDetail && (
        <TaskDetailModal
          tache={tache}
          isManager={isManager}
          onClose={() => setShowDetail(false)}
          onChange={onChange}
        />
      )}
    </div>
  );
}
