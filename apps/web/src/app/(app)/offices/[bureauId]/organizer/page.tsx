'use client';

import { Loading } from '@/components/ui/loading';

import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { StickyNoteIcon } from '@/components/icons/office-icons';
import { SubjectsChat } from '@/components/organizer/subjects-chat';
import { OfficeNav } from '@/components/offices/office-nav';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createTache,
  getBureau,
  getBureauOrganizer,
  type BureauDetail,
  type OrganizerDetail,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function OrganizerPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [org, bur] = await Promise.all([getBureauOrganizer(bureauId), getBureau(bureauId)]);
    setOrganizer(org);
    setBureau(bur);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  const isManager =
    user?.roleGlobal === 'ADMIN' ||
    bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') ||
    false;

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

  if (!organizer || !bureau) return <Loading className="text-sm" />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Organizer' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organizer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize the brain dump into Subjects; each one is classified into tasks
          independently.
        </p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SubjectsChat
          projetId={organizer.id}
          canManage={isManager}
          tasksHref={`/offices/${bureauId}/tasks`}
          mentionableUsers={bureau.membres.map((m) => ({ id: m.user.id, nom: m.user.nom }))}
        />

        {isManager && (
          <Card>
            <CardTitle className="flex items-center gap-2">
              <StickyNoteIcon className="h-5 w-5 text-brand-blue" />
              Add a task manually
            </CardTitle>
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
        )}
      </div>
    </div>
  );
}
