'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangleIcon,
  ChevronIcon,
  DoubleCheckIcon,
  FlagIcon,
  HandStopIcon,
  InfoIcon,
  RocketIcon,
} from '@/components/icons/office-icons';
import { TaskDetailModal } from '@/components/tasks/task-detail-modal';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  accepterTache,
  assignerTache,
  declarerTache,
  deleteTache,
  demarrerTache,
  pauserTache,
  reouvrirTache,
  reprendreTache,
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
  STATUT_TONE,
} from '@/lib/tache-labels';
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
  const [focusReport, setFocusReport] = useState(false);
  const [titre, setTitre] = useState(tache.titre);
  const [description, setDescription] = useState(tache.description ?? '');
  const [dateCible, setDateCible] = useState(tache.dateCible ?? '');
  const [priorite, setPriorite] = useState<PrioriteTache>(tache.priorite);
  const [dureeEstimeeHeures, setDureeEstimeeHeures] = useState(
    tache.dureeEstimeeMinutes ? String(tache.dureeEstimeeMinutes / 60) : '',
  );
  const [assigneeId, setAssigneeId] = useState(tache.assigneAId ?? '');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  // Une tâche d'équipe est fermée par défaut (juste titre + statut) pour ne pas noyer
  // la liste — une tâche personnelle reste toujours "ouverte", c'est déjà compact.
  const [open, setOpen] = useState(false);

  const isAssignee = tache.assigneAId === currentUserId;
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
        dureeEstimeeMinutes:
          dureeEstimeeHeures.trim() && !Number.isNaN(heures) ? Math.round(heures * 60) : null,
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
                setDureeEstimeeHeures(
                  tache.dureeEstimeeMinutes ? String(tache.dureeEstimeeMinutes / 60) : '',
                );
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

  async function handleDoneClick() {
    const ok = await confirmDialog({
      title: 'Submit this task as done?',
      description: 'This action is irreversible - your manager will be notified to review it.',
      confirmLabel: 'Submit',
    });
    if (!ok) return;
    setShowCommentModal(true);
  }

  async function submitDone(comment?: string) {
    await run(() => declarerTache(tache.id, comment), 'Marked as done');
    setShowCommentModal(false);
    setCommentDraft('');
  }

  const canCheckDone = isAssignee && tache.statut === 'EN_COURS';
  const isChecked = isPersonal
    ? tache.statut === 'VALIDE'
    : tache.statut === 'DECLARE' || tache.statut === 'VALIDE';
  const checkboxInteractive = isPersonal ? isAssignee && !isChecked : canCheckDone;
  const expanded = isPersonal || open;
  const activeSession = tache.sessions?.[0] ?? null;
  // Report a problem n'a de sens qu'une fois le travail réellement commencé.
  const canReport = (isAssignee || isManager) && tache.statut === 'EN_COURS';

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
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse task' : 'Expand task'}
            className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}
        <button
          title={tache.titre}
          className={`min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground ${isPersonal ? 'hover:underline' : ''}`}
          onClick={() => (isPersonal ? setShowDetail(true) : setOpen((o) => !o))}
        >
          {isPersonal ? tache.titre : truncateTitle(tache.titre)}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isPersonal &&
            (tache.assigneA ? (
              <Link
                href={`/members?userId=${tache.assigneA.id}`}
                onClick={(e) => e.stopPropagation()}
                title={tache.assigneA.nom}
              >
                {/* Sur mobile, le nom complet écrase le titre de la tâche — juste l'avatar,
                    pas de survol possible au doigt pour compenser. Le wrapper (pas le Badge
                    lui-même) porte le hidden/sm: : le Badge a déjà "inline-flex" en dur dans
                    ses propres classes, donc lui coller "hidden" en plus se joue à l'ordre
                    des règles dans la feuille Tailwind généré et perd à tous les coups. */}
                <span className="sm:hidden">
                  <Avatar nom={tache.assigneA.nom} photoUrl={tache.assigneA.photoUrl} size="sm" tone={isAssignee ? 'indigo' : 'muted'} />
                </span>
                <span className="hidden sm:inline-flex">
                  <Badge tone={isAssignee ? 'indigo' : 'neutral'}>{tache.assigneA.nom}</Badge>
                </span>
              </Link>
            ) : (
              <Badge tone="neutral">Unassigned</Badge>
            ))}
          <Badge tone={STATUT_TONE[tache.statut]}>{STATUT_LABEL[tache.statut]}</Badge>
          {tache.sante !== 'NORMAL' && (
            <Badge tone={SANTE_TONE[tache.sante]}>{SANTE_LABEL[tache.sante]}</Badge>
          )}
          {expanded && !isPersonal && (
            <button
              onClick={() => setShowDetail(true)}
              aria-label="View task details"
              title="View task details"
              className="rounded px-1 text-status-review hover:opacity-75"
            >
              <InfoIcon className="h-4 w-4" />
            </button>
          )}
          {expanded && isManager && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit task"
              title="Edit task"
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
              title="Delete task"
              className="rounded px-1 text-muted-foreground hover:text-status-review"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className={!isPersonal ? 'mt-2 border-t border-border pt-2.5' : 'mt-1'}>
          {/* Le titre dans l'en-tête reste tronqué pour la liste compacte - une fois ouverte,
              la carte a la place de le montrer en entier, sur sa propre ligne. */}
          {!isPersonal && (
            <p className="pl-6 text-sm font-medium text-foreground">{tache.titre}</p>
          )}
          {/* min-h réserve la ligne même vide (rien à afficher) — sinon les boutons du
              dessous remontent d'une carte à l'autre selon ce qu'il y a à montrer ici. */}
          <div className="flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-xs text-muted-foreground">
            {isPersonal && (
              <span className="truncate">{tache.assigneA ? tache.assigneA.nom : 'Unassigned'}</span>
            )}
            {tache.priorite !== 'NORMALE' && (
              <Badge tone={PRIORITE_TONE[tache.priorite]}>{tache.priorite}</Badge>
            )}
            {tache.statut === 'EN_COURS' && activeSession && (
              <span>
                running <LiveTimer since={activeSession.debut} />
              </span>
            )}
            {tache.statut === 'EN_COURS' && !activeSession && (
              <span className="font-medium text-status-declared">paused</span>
            )}
            {tache.commentaireDeclaration && (
              <span className="truncate italic">&quot;{tache.commentaireDeclaration}&quot;</span>
            )}
          </div>

          {error && <p className="mt-1 pl-6 text-xs text-status-review">{error}</p>}

          {!isPersonal && (
            // Une seule rangée, tout aligné à gauche — sinon la position du groupe "secondaire"
            // (Report/Move to) saute d'une carte à l'autre selon la largeur du groupe "principal".
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-6">
              {isAssignee && tache.statut === 'A_FAIRE' && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-brand-blue"
                  disabled={busy}
                  aria-label="Accept task"
                  title="Accept - take on this task"
                  onClick={() => run(() => accepterTache(tache.id), 'Task accepted')}
                >
                  <DoubleCheckIcon className="h-4 w-4" />
                </Button>
              )}
              {isAssignee && tache.statut === 'ACCEPTEE' && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-status-validated"
                  disabled={busy}
                  aria-label="Start task"
                  title="Start - begin working and start the timer"
                  onClick={() => run(() => demarrerTache(tache.id), 'Task started')}
                >
                  <RocketIcon className="h-4 w-4" />
                </Button>
              )}
              {isAssignee && tache.statut === 'A_REVOIR' && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-status-validated"
                  disabled={busy}
                  aria-label="Resubmit task"
                  title="Resubmit - start working on it again"
                  onClick={() => run(() => demarrerTache(tache.id), 'Task restarted')}
                >
                  <RocketIcon className="h-4 w-4" />
                </Button>
              )}
              {isAssignee && tache.statut === 'EN_COURS' && activeSession && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-status-declared"
                  disabled={busy}
                  aria-label="Take a break"
                  title="Break - pause the timer"
                  onClick={() => run(() => pauserTache(tache.id), 'Task paused')}
                >
                  <HandStopIcon className="h-4 w-4" />
                </Button>
              )}
              {isAssignee && tache.statut === 'EN_COURS' && !activeSession && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-indigo-600"
                  disabled={busy}
                  aria-label="Resume task"
                  title="Resume - restart the timer"
                  onClick={() => run(() => reprendreTache(tache.id), 'Task resumed')}
                >
                  <HandStopIcon className="h-4 w-4" />
                </Button>
              )}
              {canCheckDone && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-status-validated"
                  disabled={busy}
                  aria-label="Mark as done"
                  title="Done - mark as complete"
                  onClick={handleDoneClick}
                >
                  <FlagIcon className="h-4 w-4" />
                </Button>
              )}
              {canReport && (
                <Button
                  size="icon"
                  variant="plain"
                  className="text-status-review"
                  aria-label="Report a problem"
                  title="Report a problem - flag what's blocking this task"
                  onClick={() => {
                    setFocusReport(true);
                    setShowDetail(true);
                  }}
                >
                  <AlertTriangleIcon className="h-4 w-4" />
                </Button>
              )}
              {!tache.assigneAId && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    run(() => assignerTache(tache.id, currentUserId), 'Assigned to you')
                  }
                >
                  Assign to me
                </Button>
              )}
              {!tache.assigneAId && isManager && (
                <SearchableSelect
                  placeholder="Assign to…"
                  disabled={busy}
                  options={assignableMembres.map((m) => ({ value: m.user.id, label: m.user.nom }))}
                  onSelect={(userId) => run(() => assignerTache(tache.id, userId), 'Task assigned')}
                />
              )}
              {isManager && moveTargets && moveTargets.length > 0 && (
                <SearchableSelect
                  placeholder="Move to…"
                  disabled={busy}
                  options={moveTargets.map((g) => ({
                    value: g.conversationId ?? '__none__',
                    label: g.nom,
                  }))}
                  onSelect={(value) =>
                    run(
                      () =>
                        updateTache(tache.id, {
                          conversationId: value === '__none__' ? null : value,
                        }),
                      'Task moved',
                    )
                  }
                />
              )}
            </div>
          )}
        </div>
      )}

      {showDetail && (
        <TaskDetailModal
          tache={tache}
          isManager={isManager}
          currentUserId={currentUserId}
          focusBlockerForm={focusReport}
          onClose={() => {
            setShowDetail(false);
            setFocusReport(false);
          }}
          onChange={onChange}
        />
      )}

      {showCommentModal && (
        <Modal onClose={() => submitDone(undefined)}>
          <h2 className="text-lg font-bold text-foreground">Add a comment?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Would you like to add a comment to this task before submitting it?
          </p>
          <textarea
            autoFocus
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value.slice(0, 150))}
            maxLength={150}
            rows={3}
            placeholder="Optional comment…"
            className="mt-3 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{commentDraft.length}/150</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => submitDone(undefined)}>
              No
            </Button>
            <Button
              variant="success"
              disabled={busy || !commentDraft.trim()}
              onClick={() => submitDone(commentDraft.trim())}
            >
              Add Comment
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
