'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import {
  createTache,
  updateTache,
  type MyTache,
  type PrioriteTache,
} from '@/lib/api';
import { useToast } from '@/lib/toast-context';

const PRIORITES: { value: PrioriteTache; label: string; className: string }[] = [
  { value: 'BASSE', label: 'Low', className: 'bg-surface-muted text-muted-foreground' },
  { value: 'NORMALE', label: 'Normal', className: 'bg-brand-blue-light text-brand-blue-dark' },
  { value: 'HAUTE', label: 'High', className: 'bg-status-declared/10 text-status-declared' },
  { value: 'URGENTE', label: 'Urgent', className: 'bg-status-review/10 text-status-review' },
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateKeyFromIso(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeFromIso(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskCalendarModal({
  task,
  defaultDate,
  personalOrganizerId,
  onClose,
  onSaved,
}: {
  task?: MyTache;
  defaultDate: string;
  personalOrganizerId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  // Une tâche déjà rattachée à un bureau se modifie ailleurs (titre/description
  // réservés aux managers) — le calendrier n'y touche que la programmation.
  const isPersonalOrNew = !task || task.projet.bureau == null;

  const [titre, setTitre] = useState(task?.titre ?? '');
  const [date, setDate] = useState(task ? dateKeyFromIso(task.dateEcheance!) : defaultDate);
  const [heure, setHeure] = useState(task ? timeFromIso(task.dateEcheance!) : '09:00');
  const [priorite, setPriorite] = useState<PrioriteTache>(task?.priorite ?? 'NORMALE');
  const [note, setNote] = useState(task?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!titre.trim() && isPersonalOrNew && !task) {
      setError('Title is required.');
      return;
    }
    if (!date || !heure) {
      setError('Date and time are required.');
      return;
    }
    const dateEcheance = new Date(`${date}T${heure}`).toISOString();

    setBusy(true);
    setError(null);
    try {
      if (!task) {
        if (!personalOrganizerId) throw new Error('Personal organizer not ready yet');
        await createTache(personalOrganizerId, {
          titre: titre.trim(),
          description: note.trim() || undefined,
          priorite,
          dateEcheance,
        });
      } else if (isPersonalOrNew) {
        await updateTache(task.id, {
          titre: titre.trim(),
          description: note.trim() || undefined,
          priorite,
          dateEcheance,
        });
      } else {
        await updateTache(task.id, { priorite, dateEcheance });
      }
      toast(task ? 'Task updated' : 'Task added');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-foreground">{task ? 'Edit task' : 'Add a task'}</h2>

      <div className="mt-4 flex flex-col gap-3">
        {isPersonalOrNew ? (
          <Label>
            Title
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Task title" />
          </Label>
        ) : (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Task</p>
            <p className="text-sm font-semibold text-foreground">{task!.titre}</p>
            <p className="text-xs text-muted-foreground">
              {task!.projet.bureau!.nom} · only the date, time and priority are editable here
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Label>
            Date
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Label>
          <Label>
            Time
            <Input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
          </Label>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Priority</p>
          <div className="flex gap-2">
            {PRIORITES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriorite(p.value)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-opacity ${p.className} ${
                  priorite === p.value ? 'ring-2 ring-brand-blue' : 'opacity-60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isPersonalOrNew && (
          <Label>
            Note (optional)
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Link, topic…" />
          </Label>
        )}

        {error && <p className="text-xs text-status-review">{error}</p>}

        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={handleSave}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
