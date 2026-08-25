'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useState, type FormEvent } from 'react';
import { SubjectsChat } from '@/components/organizer/subjects-chat';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTache, getMyOrganizer, type OrganizerDetail, type PrioriteTache } from '@/lib/api';

const PRIORITES: PrioriteTache[] = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];

export function OrganizerTab() {
  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<PrioriteTache>('NORMALE');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setOrganizer(await getMyOrganizer());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleCreateTache(event: FormEvent) {
    event.preventDefault();
    if (!organizer) return;
    setError(null);
    setCreating(true);
    try {
      await createTache(organizer.id, { titre, description: description || undefined, priorite });
      setTitre('');
      setDescription('');
      setPriorite('NORMALE');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  if (!organizer) return <Loading className="text-sm" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <SubjectsChat projetId={organizer.id} canManage tasksHref="/my-space?tab=tasks" />

      <Card>
        <CardTitle>Add a task manually</CardTitle>
        <CardDescription className="mt-1">Skip the AI — add a task directly.</CardDescription>
        <form onSubmit={handleCreateTache} className="mt-4 flex flex-col gap-3">
          <Label>
            Title
            <Input required value={titre} onChange={(e) => setTitre(e.target.value)} />
          </Label>
          <Label>
            Description (optional)
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Label>
          <Label>
            Priority
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as PrioriteTache)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
            >
              {PRIORITES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Label>
          {error && <p className="text-xs text-status-review">{error}</p>}
          <Button type="submit" size="sm" disabled={creating} className="w-fit">
            {creating ? 'Adding…' : 'Add task'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
