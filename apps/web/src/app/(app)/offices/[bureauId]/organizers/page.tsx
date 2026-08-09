'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOrganizer, getBureau, listOrganizers, type Organizer } from '@/lib/api';

export default function OrganizersPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;

  const [organizers, setOrganizers] = useState<Organizer[] | null>(null);
  const [bureauNom, setBureauNom] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [orgs, bureau] = await Promise.all([listOrganizers(bureauId), getBureau(bureauId)]);
    setOrganizers(orgs);
    setBureauNom(bureau.nom);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createOrganizer(bureauId, { nom });
      setNom('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureauNom ?? '…', href: `/offices/${bureauId}` },
          { label: 'Organizers' },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dump ideas in bulk — every few hours they get turned into tasks automatically.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New organizer'}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <Label className="flex-1">
              Organizer name
              <Input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Random ideas" />
            </Label>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-status-review">{error}</p>}
        </Card>
      )}

      {organizers === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : organizers.length === 0 ? (
        <Card>
          <CardDescription>No organizer yet.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizers.map((org) => (
            <Link key={org.id} href={`/offices/${bureauId}/organizers/${org.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{org.nom}</CardTitle>
                  <CardDescription>
                    {org._count.membres} member{org._count.membres === 1 ? '' : 's'} ·{' '}
                    {org._count.taches} task{org._count.taches === 1 ? '' : 's'} generated
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
