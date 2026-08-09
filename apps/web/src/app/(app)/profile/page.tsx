'use client';

import { useState, type FormEvent } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [nom, setNom] = useState(user?.nom ?? '');
  const [poste, setPoste] = useState(user?.poste ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateProfile({ nom, poste, bio });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label>
            Full name
            <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
          </Label>
          <Label>
            Role / title
            <Input value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Developer, Designer…" />
          </Label>
          <Label>
            Short bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
            />
          </Label>
          {error && <p className="text-sm text-status-review">{error}</p>}
          {saved && <p className="text-sm text-status-validated">Profile updated.</p>}
          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
