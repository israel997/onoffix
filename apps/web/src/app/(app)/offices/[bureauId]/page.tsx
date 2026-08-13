'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BureauChat } from '@/components/chat/bureau-chat';
import { OfficeNav } from '@/components/offices/office-nav';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addMembre,
  getBureau,
  listOrganisationMembres,
  removeMembre,
  updateMembre,
  type BureauDetail,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function OfficeDetailPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [orgMembres, setOrgMembres] = useState<OrganisationMembre[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [roleInterne, setRoleInterne] = useState('');
  const [roleDansBureau, setRoleDansBureau] = useState<'COLLABORATEUR' | 'MANAGER'>('COLLABORATEUR');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [bureauData, membresData] = await Promise.all([
      getBureau(bureauId),
      listOrganisationMembres(),
    ]);
    setBureau(bureauData);
    setOrgMembres(membresData);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  const isManager =
    user?.roleGlobal === 'ADMIN' ||
    bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER');

  const availableMembres = useMemo(() => {
    if (!bureau || !orgMembres) return [];
    const alreadyIn = new Set(bureau.membres.map((m) => m.user.id));
    return orgMembres.filter((m) => !alreadyIn.has(m.id));
  }, [bureau, orgMembres]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedEmail) {
      setError('Pick a collaborator to add.');
      return;
    }
    setSubmitting(true);
    try {
      await addMembre(bureauId, {
        email: selectedEmail,
        roleDansBureau,
        roleInterne: roleInterne || undefined,
      });
      setSelectedEmail('');
      setRoleInterne('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, role: 'MANAGER' | 'COLLABORATEUR') {
    await updateMembre(bureauId, userId, { roleDansBureau: role });
    await load();
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member from the office?')) return;
    await removeMembre(bureauId, userId);
    await load();
  }

  if (!bureau) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">{bureau.nom}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily check-in at {bureau.heureDeclaration} ({bureau.fuseauHoraire})
        </p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={!!isManager} />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle>Members</CardTitle>
            <CardDescription>{bureau.membres.length} people in this office.</CardDescription>
          </div>
          {isManager && (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'Add member'}
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
            {availableMembres.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every organisation member is already in this office. Add new people from the{' '}
                <a href="/members" className="font-medium text-brand-blue hover:underline">
                  Members
                </a>{' '}
                page first.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Collaborator
                  <select
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
                  >
                    <option value="">Select someone…</option>
                    {availableMembres.map((m) => (
                      <option key={m.id} value={m.email}>
                        {m.nom} ({m.email})
                      </option>
                    ))}
                  </select>
                </Label>
                <Label>
                  Internal role
                  <Input
                    value={roleInterne}
                    onChange={(e) => setRoleInterne(e.target.value)}
                    placeholder="Developer, Designer…"
                  />
                </Label>
              </div>
            )}
            <Label className="max-w-xs">
              Office role
              <select
                value={roleDansBureau}
                onChange={(e) => setRoleDansBureau(e.target.value as 'COLLABORATEUR' | 'MANAGER')}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="COLLABORATEUR">Collaborator</option>
                <option value="MANAGER">Manager</option>
              </select>
            </Label>
            {error && <p className="text-sm text-status-review">{error}</p>}
            {availableMembres.length > 0 && (
              <Button type="submit" disabled={submitting} className="w-fit">
                {submitting ? 'Adding…' : 'Add to office'}
              </Button>
            )}
          </form>
        )}

        <div className="flex flex-col divide-y divide-border">
          {bureau.membres.map((m) => (
            <div key={m.user.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{m.user.nom}</p>
                <p className="text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {m.roleInterne && <Badge tone="brand">{m.roleInterne}</Badge>}
                {isManager ? (
                  <select
                    value={m.roleDansBureau}
                    onChange={(e) => handleRoleChange(m.user.id, e.target.value as 'MANAGER' | 'COLLABORATEUR')}
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
                  >
                    <option value="COLLABORATEUR">Collaborator</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                ) : (
                  <Badge tone="neutral">{m.roleDansBureau === 'MANAGER' ? 'Manager' : 'Collaborator'}</Badge>
                )}
                {isManager && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(m.user.id)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
          {bureau.membres.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No member yet.</p>
          )}
        </div>
      </Card>

      <BureauChat bureauId={bureauId} />
    </div>
  );
}
