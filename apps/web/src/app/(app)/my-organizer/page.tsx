'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { SubjectsChat } from '@/components/organizer/subjects-chat';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTache, getMyOrganizer, type OrganizerDetail } from '@/lib/api';

export default function MyOrganizerPage() {
  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
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
      await createTache(organizer.id, { titre, description: description || undefined });
      setTitre('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  if (!organizer) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Organizer' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Organizer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your private brain dump — strictly yours, nobody else can see it. Organize it into
          Subjects; each one is classified into tasks independently.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SubjectsChat projetId={organizer.id} canManage tasksHref="/my-tasks" />

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
            {error && <p className="text-xs text-status-review">{error}</p>}
            <Button type="submit" size="sm" disabled={creating} className="w-fit">
              {creating ? 'Adding…' : 'Add task'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
