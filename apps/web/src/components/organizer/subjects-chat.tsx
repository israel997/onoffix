'use client';

import { Loading } from '@/components/ui/loading';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Chat } from '@/components/chat/chat';
import { Button } from '@/components/ui/button';
import {
  createOrganizerSubject,
  deleteOrganizerSubject,
  listOrganizerMessages,
  listOrganizerSubjects,
  renameOrganizerSubject,
  retryOrganizerProcessing,
  sendOrganizerFile,
  type CouleurBureau,
  type Subject,
} from '@/lib/api';
import { BUREAU_COLORS } from '@/lib/bureau-colors';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

/** Le dernier événement pour ce Subject est-il un échec (pas encore résolu par un succès depuis) ? */
function hasFailedProcessing(subject: Subject) {
  if (!subject.dernierEchecTraitement) return false;
  if (!subject.derniereGenerationTaches) return true;
  return new Date(subject.dernierEchecTraitement) > new Date(subject.derniereGenerationTaches);
}

export function SubjectsChat({
  projetId,
  canManage,
  tasksHref,
  mentionableUsers,
  couleur,
  onSubjectsChanged,
}: {
  projetId: string;
  canManage: boolean;
  tasksHref?: string;
  mentionableUsers?: { id: string; nom: string }[];
  couleur?: CouleurBureau;
  /** Prévient le parent qu'un Subject a été créé/renommé/supprimé (ex. pour rafraîchir
   * un formulaire "Add task manually" qui a sa propre copie de la liste des Subjects). */
  onSubjectsChanged?: () => void;
}) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function load(keepActive = true) {
    const list = await listOrganizerSubjects(projetId);
    setSubjects(list);
    setActiveId((prev) =>
      keepActive && prev && list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? null),
    );
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(false);
    // Le traitement IA se termine en tâche de fond (parfois après plusieurs relances
    // en cas de panne) — sans ça, "Not processed yet" resterait affiché jusqu'à un
    // rechargement manuel même une fois le traitement effectivement terminé.
    const interval = setInterval(() => load(), 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const nom = newName.trim();
    if (!nom) return;
    setCreating(true);
    try {
      const subject = await createOrganizerSubject(projetId, nom);
      setNewName('');
      await load();
      setActiveId(subject.id);
      onSubjectsChanged?.();
      toast(`Subject "${nom}" created`);
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(subject: Subject) {
    const nom = window.prompt('Rename subject', subject.nom)?.trim();
    if (!nom || nom === subject.nom) return;
    await renameOrganizerSubject(projetId, subject.id, nom);
    await load();
    onSubjectsChanged?.();
    toast('Subject renamed');
  }

  async function handleDelete(subject: Subject) {
    const ok = await confirmDialog({
      title: `Delete subject "${subject.nom}"?`,
      description: 'Its messages will be lost.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await deleteOrganizerSubject(projetId, subject.id);
    await load(false);
    onSubjectsChanged?.();
    toast('Subject deleted');
  }

  async function handleRetry(subject: Subject) {
    setRetrying(true);
    try {
      await retryOrganizerProcessing(projetId, subject.id);
      toast('Retrying task generation…');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setRetrying(false);
    }
  }

  function focusManualTaskForm() {
    document.getElementById('manual-task-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('manual-task-title')?.focus();
  }

  const active = subjects?.find((s) => s.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {subjects?.map((s) => (
          <div key={s.id} className="group flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={s.id === activeId ? 'primary' : 'secondary'}
              onClick={() => setActiveId(s.id)}
            >
              {s.nom}
            </Button>
            {canManage && (
              <span className="hidden items-center gap-1 group-hover:flex">
                <button
                  type="button"
                  aria-label={`Rename ${s.nom}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleRename(s)}
                >
                  ✎
                </button>
                {subjects.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Delete ${s.nom}`}
                    className="text-xs text-muted-foreground hover:text-status-review"
                    onClick={() => handleDelete(s)}
                  >
                    ✕
                  </button>
                )}
              </span>
            )}
          </div>
        ))}
        {canManage && (
          <form onSubmit={handleCreate} className="flex items-center gap-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New subject…"
              className="h-8 w-32 rounded-md border border-border bg-surface px-2 text-xs outline-none focus:border-brand-blue"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={creating || !newName.trim()}>
              +
            </Button>
          </form>
        )}
        {tasksHref && active && (
          <Link
            href={`${tasksHref}#subject-${encodeURIComponent(active.nom)}`}
            className="ml-auto text-xs text-brand-blue hover:underline"
          >
            View tasks →
          </Link>
        )}
      </div>

      {active && hasFailedProcessing(active) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-status-review/10 px-3 py-2 text-xs text-status-review">
          <span>Task generation failed for this subject (temporary AI outage) — your messages are safe.</span>
          <div className="flex shrink-0 gap-2">
            {canManage && (
              <Button size="sm" variant="secondary" onClick={focusManualTaskForm}>
                Add task manually (to save time)
              </Button>
            )}
            <Button size="sm" variant="danger" disabled={retrying} onClick={() => handleRetry(active)}>
              {retrying ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </div>
      )}

      {active ? (
        <Chat
          key={active.id}
          roomId={active.id}
          roomKey="subjectId"
          joinEvent="organizer:join"
          leaveEvent="organizer:leave"
          messageEvent="organizer:message"
          fetchHistory={(subjectId) => listOrganizerMessages(projetId, subjectId)}
          uploadFile={(subjectId, file, contenu, replyToId) =>
            sendOrganizerFile(projetId, subjectId, file, contenu, replyToId)
          }
          mentionableUsers={mentionableUsers}
          accentColor={couleur ? { bubble: BUREAU_COLORS[couleur].bubble, bubbleDark: BUREAU_COLORS[couleur].bubbleDark } : undefined}
          title={active.nom}
          description={
            active.derniereGenerationTaches
              ? `Last processed ${new Date(active.derniereGenerationTaches).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'Not processed yet: tasks are generated automatically.'
          }
        />
      ) : (
        <Loading className="text-sm" />
      )}
    </div>
  );
}
