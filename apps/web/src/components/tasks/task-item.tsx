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
  type PrioriteTache,
  type Tache,
} from '@/lib/api';
import { useConfirm } from '@/lib/confirm-context';
import {
  PRIORITE_TONE,
  SANTE_LABEL,
  SANTE_TONE,
  STATUT_LABEL,
  STATUT_PROGRESS,
  STATUT_TONE,
} from '@/lib/tache-labels';
import { useToast } from '@/lib/toast-context';

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const PRIORITES: PrioriteTache[] = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];

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
  moveTargets,
  onChange,
}: {
  tache: Tache;
  currentUserId: string;
  isManager: boolean;
  isAdmin?: boolean;
  assignableMembres: { user: { id: string; nom: string } }[];
  moveTargets?: { conversationId: string | null; nom: string }[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [titre, setTitre] = useState(tache.titre);
  const [description, setDescription] = useState(tache.description ?? '');
  const [dateCible, setDateCible] = useState(tache.dateCible ?? '');
  const [priorite, setPriorite] = useState<PrioriteTache>(tache.priorite);
  const [dureeEstimeeHeures, setDureeEstimeeHeures] = useState(
    tache.dureeEstimeeMinutes ? String(tache.dureeEstimeeMinutes / 60) : '',
  );

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
    const heures = parseFloat(dureeEstimeeHeures);
    await run(
      () =>
        updateTache(tache.id, {
          titre,
          description: description || undefined,
          dateCible: dateCible || null,
          priorite,
          dureeEstimeeMinutes: dureeEstimeeHeures.trim() && !Number.isNaN(heures) ? Math.round(heures * 60) : null,
        }),
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
            Priority
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as PrioriteTache)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            >
              {PRIORITES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Estimated time (hours)
            <Input
              type="number"
              min="0"
              step="0.5"
              value={dureeEstimeeHeures}
              onChange={(e) => setDureeEstimeeHeures(e.target.value)}
              placeholder="e.g. 2"
            />
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
                setPriorite(tache.priorite);
                setDureeEstimeeHeures(tache.dureeEstimeeMinutes ? String(tache.dureeEstimeeMinutes / 60) : '');
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
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={STATUT_TONE[tache.statut]}>{STATUT_LABEL[tache.statut]}</Badge>
          {tache.sante !== 'NORMAL' && <Badge tone={SANTE_TONE[tache.sante]}>{SANTE_LABEL[tache.sante]}</Badge>}
          {isManager && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit task"
              className="rounded px-1 text-muted-foreground hover:text-foreground"
            >
              ✎
            </button>
          )}
          {canDeleteTask && (
            <button
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `Delete "${tache.titre}"?`,
                  description: 'This cannot be undone.',
                  confirmLabel: 'Delete',
                  danger: true,
                });
                if (ok) run(() => deleteTache(tache.id), 'Task deleted');
              }}
              aria-label="Delete task"
              className="rounded px-1 text-muted-foreground hover:text-status-review"
            >
              🗑
            </button>
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
        {tache.dureeEstimeeMinutes != null && (
          <span>· estimated {formatMinutes(tache.dureeEstimeeMinutes)}</span>
        )}
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

        {isAssignee && tache.statut === 'ACCEPTEE' && (
          <Button size="sm" disabled={busy} onClick={() => run(() => demarrerTache(tache.id), 'Task started')}>
            Start
          </Button>
        )}

        {isAssignee && tache.statut === 'A_REVOIR' && (
          <Button size="sm" disabled={busy} onClick={() => run(() => demarrerTache(tache.id), 'Task restarted')}>
            Resubmit
          </Button>
        )}

        {isAssignee && tache.statut === 'EN_COURS' && (
          <Button size="sm" disabled={busy} onClick={() => run(() => declarerTache(tache.id), 'Marked as done')}>
            Mark as done
          </Button>
        )}

        {!tache.assigneAId && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => assignerTache(tache.id, currentUserId), 'Assigned to you')}
          >
            Assign to me
          </Button>
        )}

        {(isAssignee || isManager) &&
          (tache.statut === 'ACCEPTEE' || tache.statut === 'EN_COURS' || tache.statut === 'A_REVOIR') && (
            <Button size="sm" variant="secondary" onClick={() => setShowDetail(true)}>
              Report a problem
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

        {isManager && moveTargets && moveTargets.length > 0 && (
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const conversationId = e.target.value === '__none__' ? null : e.target.value;
              run(() => updateTache(tache.id, { conversationId }), 'Task moved');
            }}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
          >
            <option value="" disabled>
              Move to…
            </option>
            {moveTargets.map((g) => (
              <option key={g.conversationId ?? '__none__'} value={g.conversationId ?? '__none__'}>
                {g.nom}
              </option>
            ))}
          </select>
        )}
      </div>

      {showDetail && (
        <TaskDetailModal
          tache={tache}
          isManager={isManager}
          currentUserId={currentUserId}
          onClose={() => setShowDetail(false)}
          onChange={onChange}
        />
      )}
    </div>
  );
}
