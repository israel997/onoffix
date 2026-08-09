'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Chat } from '@/components/chat/chat';
import { TaskItem } from '@/components/tasks/task-item';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import {
  deleteOrganizer,
  getBureau,
  addOrganizerMembre,
  getOrganizer,
  listOrganizerMessages,
  removeOrganizerMembre,
  sendOrganizerFile,
  type BureauDetail,
  type OrganizerDetail,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function OrganizerDetailPage() {
  const params = useParams<{ bureauId: string; organizerId: string }>();
  const { bureauId, organizerId } = params;
  const router = useRouter();
  const { user } = useAuth();

  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const [org, bur] = await Promise.all([getOrganizer(organizerId), getBureau(bureauId)]);
    setOrganizer(org);
    setBureau(bur);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizerId, bureauId]);

  const availableMembres = useMemo(() => {
    if (!bureau || !organizer) return [];
    const alreadyIn = new Set(organizer.membres.map((m) => m.user.id));
    return bureau.membres.filter((m) => !alreadyIn.has(m.user.id));
  }, [bureau, organizer]);

  const isManager =
    user?.roleGlobal === 'ADMIN' ||
    bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') ||
    false;

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedEmail) {
      setError('Pick a collaborator to add.');
      return;
    }
    setSubmitting(true);
    try {
      await addOrganizerMembre(organizerId, selectedEmail);
      setSelectedEmail('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this collaborator from the organizer?')) return;
    await removeOrganizerMembre(organizerId, userId);
    await load();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${organizer?.nom}"? This removes its chat and generated tasks.`)) return;
    setDeleting(true);
    try {
      await deleteOrganizer(organizerId);
      router.push(`/offices/${bureauId}/organizers`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  if (!organizer) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau?.nom ?? '…', href: `/offices/${bureauId}` },
          { label: 'Organizers', href: `/offices/${bureauId}/organizers` },
          { label: organizer.nom },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{organizer.nom}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organizer.derniereGenerationTaches
              ? `Last processed ${new Date(organizer.derniereGenerationTaches).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'Not processed yet — tasks are generated every few hours.'}
          </p>
        </div>
        <Button variant="danger" size="sm" disabled={deleting} onClick={handleDelete}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Chat
          roomId={organizerId}
          roomKey="projetId"
          joinEvent="organizer:join"
          leaveEvent="organizer:leave"
          messageEvent="organizer:message"
          fetchHistory={listOrganizerMessages}
          uploadFile={sendOrganizerFile}
          title="Brain dump"
          description="Write anything — it gets turned into tasks automatically."
        />

        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Members</CardTitle>
              <Button size="sm" onClick={() => setShowForm((v) => !v)}>
                {showForm ? 'Cancel' : 'Add'}
              </Button>
            </div>

            {showForm && (
              <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2 rounded-xl bg-surface-muted p-3">
                {availableMembres.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Everyone in this office is already here.</p>
                ) : (
                  <select
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
                  >
                    <option value="">Select someone…</option>
                    {availableMembres.map((m) => (
                      <option key={m.user.id} value={m.user.email}>
                        {m.user.nom}
                      </option>
                    ))}
                  </select>
                )}
                {error && <p className="text-xs text-status-review">{error}</p>}
                {availableMembres.length > 0 && (
                  <Button type="submit" size="sm" disabled={submitting} className="w-fit">
                    {submitting ? 'Adding…' : 'Add'}
                  </Button>
                )}
              </form>
            )}

            <div className="flex flex-col divide-y divide-border">
              {organizer.membres.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between py-2">
                  <p className="text-sm text-foreground">{m.user.nom}</p>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(m.user.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Generated tasks</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{organizer.taches.length} so far.</p>
            <div className="mt-4 flex flex-col gap-2">
              {organizer.taches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                user &&
                organizer.taches.map((t) => (
                  <TaskItem
                    key={t.id}
                    tache={t}
                    currentUserId={user.id}
                    isManager={isManager}
                    assignableMembres={organizer.membres}
                    onChange={load}
                  />
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
