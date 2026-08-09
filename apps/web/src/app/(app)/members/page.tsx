'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addOrganisationMembre, listOrganisationMembres, type OrganisationMembre } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function MembersPage() {
  const { user } = useAuth();
  const [membres, setMembres] = useState<OrganisationMembre[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setMembres(await listOrganisationMembres());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await addOrganisationMembre({ email, nom, password });
      setEmail('');
      setNom('');
      setPassword('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  const isAdmin = user?.roleGlobal === 'ADMIN';

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Members' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone in your organisation.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add member'}</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3 sm:items-end">
            <Label>
              Full name
              <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
            </Label>
            <Label>
              Email
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Label>
            <Label>
              Temporary password
              <Input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Label>
            <Button type="submit" disabled={creating} className="w-fit sm:col-span-3">
              {creating ? 'Adding…' : 'Add to organisation'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-status-review">{error}</p>}
        </Card>
      )}

      <Card>
        {membres === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {membres.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.nom}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.bureaux.map((b) => (
                    <Badge key={b.bureau.id} tone="neutral">
                      {b.bureau.nom}
                    </Badge>
                  ))}
                  <Badge tone={m.roleGlobal === 'ADMIN' ? 'brand' : 'neutral'}>
                    {m.roleGlobal === 'ADMIN' ? 'Admin' : 'Member'}
                  </Badge>
                </div>
              </div>
            ))}
            {membres.length === 0 && (
              <CardDescription>No member yet.</CardDescription>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
