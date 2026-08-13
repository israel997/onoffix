'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addOrganisationMembre,
  cancelOrganisationInvitation,
  listOrganisationInvitations,
  listOrganisationMembres,
  removeOrganisationMembre,
  updateOrganisationMembreRole,
  type Invitation,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

export default function MembersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [membres, setMembres] = useState<OrganisationMembre[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function load() {
    const [membresData, invitationsData] = await Promise.all([
      listOrganisationMembres(),
      listOrganisationInvitations(),
    ]);
    setMembres(membresData);
    setInvitations(invitationsData);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setCreating(true);
    try {
      const result = await addOrganisationMembre({ email, nom });
      const message =
        result.status === 'added'
          ? `${nom} was added to the organisation.`
          : `Invitation sent to ${email}.`;
      setNotice(message);
      toast(message);
      setEmail('');
      setNom('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isOwner = !!user && user.organisation.proprietaireId === user.id;

  async function handleRoleChange(membre: OrganisationMembre, roleGlobal: 'ADMIN' | 'MEMBRE') {
    setUpdatingRoleId(membre.id);
    setError(null);
    try {
      await updateOrganisationMembreRole(membre.id, roleGlobal);
      await load();
      toast(`${membre.nom} is now ${roleGlobal === 'ADMIN' ? 'an admin' : 'a member'}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast(message, 'error');
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleRemove(membre: OrganisationMembre) {
    const ok = await confirmDialog({
      title: `Remove ${membre.nom}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setRemovingId(membre.id);
    setError(null);
    try {
      await removeOrganisationMembre(membre.id);
      await load();
      toast(`${membre.nom} was removed`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast(message, 'error');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCancelInvitation(invitation: Invitation) {
    setCancellingId(invitation.id);
    setError(null);
    try {
      await cancelOrganisationInvitation(invitation.id);
      await load();
      toast('Invitation cancelled');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast(message, 'error');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Members' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone in your organisation.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Invite member'}</Button>
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
            <Button type="submit" disabled={creating} className="w-fit">
              {creating ? 'Sending…' : 'Send invitation'}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            If this email already has an OOffix account, they&apos;ll be added right away. Otherwise
            they&apos;ll get an email invitation to set their own password.
          </p>
          {error && <p className="mt-2 text-sm text-status-review">{error}</p>}
        </Card>
      )}

      {notice && <p className="text-sm text-status-validated">{notice}</p>}

      <Card>
        <CardTitle>Members</CardTitle>
        {membres === null || invitations === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.nom}</p>
                  <p className="text-xs text-muted-foreground">{inv.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="declared">Pending</Badge>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cancellingId === inv.id}
                      onClick={() => handleCancelInvitation(inv)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {membres.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.nom}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {m.bureaux.map((b) => (
                    <Badge key={b.bureau.id} tone="neutral">
                      {b.bureau.nom}
                    </Badge>
                  ))}
                  {m.id === user?.organisation.proprietaireId ? (
                    <Badge tone="brand">Owner</Badge>
                  ) : (
                    <Badge tone={m.roleGlobal === 'ADMIN' ? 'brand' : 'neutral'}>
                      {m.roleGlobal === 'ADMIN' ? 'Admin' : 'Member'}
                    </Badge>
                  )}
                  {isOwner && m.id !== user?.organisation.proprietaireId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updatingRoleId === m.id}
                      onClick={() =>
                        handleRoleChange(m, m.roleGlobal === 'ADMIN' ? 'MEMBRE' : 'ADMIN')
                      }
                    >
                      {m.roleGlobal === 'ADMIN' ? 'Remove admin' : 'Make admin'}
                    </Button>
                  )}
                  {isAdmin && m.id !== user?.organisation.proprietaireId && m.id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removingId === m.id}
                      onClick={() => handleRemove(m)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {membres.length === 0 && invitations.length === 0 && (
              <CardDescription>No member yet.</CardDescription>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
