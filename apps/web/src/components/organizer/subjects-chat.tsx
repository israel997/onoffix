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
  sendOrganizerFile,
  type Subject,
} from '@/lib/api';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

export function SubjectsChat({
  projetId,
  canManage,
  tasksHref,
  mentionableUsers,
}: {
  projetId: string;
  canManage: boolean;
  tasksHref?: string;
  mentionableUsers?: { id: string; nom: string }[];
}) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
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
    toast('Subject deleted');
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
