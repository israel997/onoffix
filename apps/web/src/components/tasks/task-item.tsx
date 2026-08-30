'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronIcon, InfoIcon } from '@/components/icons/office-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import {
  accepterTache,
  annulerDeclarationTache,
  assignerTache,
  declarerTache,
  deleteTache,
  demarrerTache,
  reouvrirTache,
  updateTache,
  validerTache,
  type PrioriteTache,
  type Tache,
} from '@/lib/api';
import { useConfirm } from '@/lib/confirm-context';
import { PRIORITE_TONE, SANTE_LABEL, SANTE_TONE, STATUT_LABEL, STATUT_TONE } from '@/lib/tache-labels';
import { useToast } from '@/lib/toast-context';

const TITLE_MAX_CHARS = 28;

function truncateTitle(title: string) {
  return title.length > TITLE_MAX_CHARS ? `${title.slice(0, TITLE_MAX_CHARS - 1)}…` : title;
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
  isPersonal = false,
  assignableMembres,
  moveTargets,
  onChange,
}: {
  tache: Tache;
  currentUserId: string;
  isManager: boolean;
  isAdmin?: boolean;
  /** Tâche de l'Organizer personnel (pas de bureau) : pas de workflow d'équipe, juste fait/pas fait. */
  isPersonal?: boolean;
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
  const [assigneeId, setAssigneeId] = useState(tache.assigneAId ?? '');
  const [doneComment, setDoneComment] = useState('');
  // Une tâche d'équipe est fermée par défaut (juste titre + statut) pour ne pas noyer
  // la liste — une tâche personnelle reste toujours "ouverte", c'est déjà compact.
  const [open, setOpen] = useState(false);
  const [showInfoTip, setShowInfoTip] = useState(false);

  function toggleOpen() {
    setOpen((o) => {
      const next = !o;
      if (next) setShowInfoTip(true);
      return next;
    });
  }

  const isAssignee = tache.assigneAId === currentUserId;
  const isAssigner = tache.assigneParId === currentUserId;
  const canValidate = tache.statut === 'DECLARE' && (isAssigner || isManager);
  const canDeleteTask = isAdmin || isManager || (isPersonal && isAssignee);
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
    await run(async () => {
      await updateTache(tache.id, {
        titre,
        description: description || undefined,
        dateCible: dateCible || null,
        priorite,
        dureeEstimeeMinutes: dureeEstimeeHeures.trim() && !Number.isNaN(heures) ? Math.round(heures * 60) : null,
      });
      if (assigneeId && assigneeId !== tache.assigneAId) {
        await assignerTache(tache.id, assigneeId);
      }
    }, 'Task updated');
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
          {!isPersonal && (
            <Label>
              Assigned to
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="" disabled>
                  Unassigned
                </option>
                {assignableMembres.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.nom}
                  </option>
                ))}
              </select>
            </Label>
          )}
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
                setAssigneeId(tache.assigneAId ?? '');
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

  // Tâche personnelle : pas de workflow d'équipe (accepter/démarrer/valider séparément),
  // juste "fait ou pas" — la case coche enchaîne toutes les étapes nécessaires d'un coup.
  async function completePersonalTask() {
    await run(async () => {
      let statut = tache.statut;
      if (statut === 'A_FAIRE') {
        await accepterTache(tache.id);
        statut = 'ACCEPTEE';
      }
      if (statut === 'ACCEPTEE' || statut === 'A_REVOIR') {
        await demarrerTache(tache.id);
        statut = 'EN_COURS';
      }
      if (statut === 'EN_COURS') {
        await declarerTache(tache.id);
        statut = 'DECLARE';
      }
      if (statut === 'DECLARE') {
        await validerTache(tache.id, 'ok');
      }
    }, 'Task completed');
  }

  const canCheckDone = isAssignee && tache.statut === 'EN_COURS';
  const isChecked = isPersonal ? tache.statut === 'VALIDE' : tache.statut === 'DECLARE' || tache.statut === 'VALIDE';
  const checkboxInteractive = isPersonal ? isAssignee && !isChecked : canCheckDone || canValidate;
  const expanded = isPersonal || open;

  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-start gap-2">
        {isPersonal && (checkboxInteractive || isChecked) && (
          <input
            type="checkbox"
            checked={isChecked}
            disabled={busy || (!checkboxInteractive && !isChecked)}
            onChange={() => {
              if (isChecked) run(() => reouvrirTache(tache.id), 'Task reopened');
              else completePersonalTask();
            }}
            aria-label="Mark task as done"
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand-blue"
          />
        )}
        {!isPersonal && (
          <button
            onClick={toggleOpen}
            aria-label={open ? 'Collapse task' : 'Expand task'}
            className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
        <button
          className={`min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground ${isPersonal ? 'hover:underline' : ''}`}
          onClick={() => (isPersonal ? setShowDetail(true) : toggleOpen())}
        >
          {isPersonal ? tache.titre : truncateTitle(tache.titre)}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isPersonal &&
            (tache.assigneA ? (
              <Link href={`/members?userId=${tache.assigneA.id}`} onClick={(e) => e.stopPropagation()}>
                <Badge tone={isAssignee ? 'indigo' : 'neutral'}>{tache.assigneA.nom}</Badge>
              </Link>
            ) : (
              <Badge tone="neutral">Unassigned</Badge>
            ))}
          <Badge tone={STATUT_TONE[tache.statut]}>{STATUT_LABEL[tache.statut]}</Badge>
          {tache.sante !== 'NORMAL' && <Badge tone={SANTE_TONE[tache.sante]}>{SANTE_LABEL[tache.sante]}</Badge>}
          {expanded && !isPersonal && (
            <button
              onClick={() => setShowDetail(true)}
              aria-label="View task details"
              className="rounded px-1 text-status-review hover:opacity-75"
            >
              <InfoIcon className="h-4 w-4" />
            </button>
          )}
          {expanded && isManager && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit task"
              className="rounded px-1 text-muted-foreground hover:text-foreground"
            >
              ✎
            </button>
          )}
          {expanded && canDeleteTask && (
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

      {!isPersonal && open && showInfoTip && (
        <div className="mt-1.5 ml-6 flex items-center justify-between gap-2 rounded-lg bg-status-review/10 px-2 py-1.5 text-xs text-status-review">
          <span className="flex items-center gap-1.5">
            <InfoIcon className="h-3.5 w-3.5 shrink-0" />
            Click the red info icon to see the full task details.
          </span>
          <button
            onClick={() => setShowInfoTip(false)}
            aria-label="Dismiss"
            className="shrink-0 hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}

      {expanded && (
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-xs text-muted-foreground">
        {isPersonal && <span className="truncate">{tache.assigneA ? tache.assigneA.nom : 'Unassigned'}</span>}
        {tache.priorite !== 'NORMALE' && (
          <Badge tone={PRIORITE_TONE[tache.priorite]}>{tache.priorite}</Badge>
        )}
        {tache.statut === 'EN_COURS' && tache.dateDebut && (
          <span>
            running <LiveTimer since={tache.dateDebut} />
          </span>
        )}
        {tache.commentaireDeclaration && (
          <span className="truncate italic">&quot;{tache.commentaireDeclaration}&quot;</span>
        )}
      </div>
      )}

      {expanded && error && <p className="mt-1 pl-6 text-xs text-status-review">{error}</p>}

      {!isPersonal && expanded && (
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        {!tache.assigneAId && isManager && (
          <select
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) run(() => assignerTache(tache.id, e.target.value), 'Task assigned');
            }}
            className="h-7 rounded-lg border border-border bg-surface px-2 text-xs"
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
          <Button size="sm" variant="success" disabled={busy} onClick={() => run(() => demarrerTache(tache.id), 'Task started')}>
            Start
          </Button>
        )}

        {isAssignee && tache.statut === 'A_REVOIR' && (
          <Button size="sm" variant="success" disabled={busy} onClick={() => run(() => demarrerTache(tache.id), 'Task restarted')}>
            Resubmit
          </Button>
        )}

        {canCheckDone && (
          <>
            <input
              value={doneComment}
              onChange={(e) => setDoneComment(e.target.value)}
              placeholder="Comment (optional)"
              className="h-7 w-40 rounded-lg border border-border bg-surface px-2 text-xs"
            />
            <Button
              size="sm"
              variant="success"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await declarerTache(tache.id, doneComment);
                  setDoneComment('');
                }, 'Marked as done')
              }
            >
              Done
            </Button>
          </>
        )}

        {isAssignee && tache.statut === 'DECLARE' && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => annulerDeclarationTache(tache.id), 'Undone - back to in progress')}
          >
            Undone
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
            <Button size="sm" variant="danger" onClick={() => setShowDetail(true)}>
              Report a problem
            </Button>
          )}

        {canValidate && (
          <Button size="sm" disabled={busy} onClick={() => run(() => validerTache(tache.id, 'ok'), 'Task approved')}>
            Approve
          </Button>
        )}

        {canValidate && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => validerTache(tache.id, 'litige'), 'Sent back for rework')}
          >
            Send back
          </Button>
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
            className="h-7 rounded-lg border border-border bg-surface px-2 text-xs"
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
      )}

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
