'use client';

import { useState, type FormEvent } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createOrganisation, storeTokens } from '@/lib/api';

export default function NewOrganisationPage() {
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const tokens = await createOrganisation(nom);
      storeTokens(tokens);
      // Rechargement complet plutôt qu'une navigation client : la socket temps réel et
      // l'état local de plusieurs composants restent autrement accrochés à l'ancienne
      // organisation (elle n'est jamais reconnectée quand le token change sous elle).
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setCreating(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'New organisation' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create an organisation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ll be its owner. Your account can own up to 2 organisations.
        </p>
      </div>

      <Card>
        <CardTitle>Organisation details</CardTitle>
        <CardDescription className="mt-1">You can change the name and add a logo later.</CardDescription>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Label>
            Organisation name
            <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
          </Label>
          {error && <p className="text-sm text-status-review">{error}</p>}
          <Button type="submit" disabled={creating} className="w-fit">
            {creating ? 'Creating…' : 'Create organisation'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
