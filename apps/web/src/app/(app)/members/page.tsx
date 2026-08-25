'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useState, type FormEvent } from 'react';
import { ChairIcon, ExitIcon } from '@/components/icons/office-icons';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
  addOrganisationMembre,
  cancelOrganisationInvitation,
  listOrganisationInvitations,
  listOrganisationMembres,
  removeOrganisationMembre,
  resolveAssetUrl,
  updateMembrePoste,
  updateOrganisationMembreRole,
  type Invitation,
  type OrganisationMembre,
} from '@/lib/api';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function MemberAvatar({ nom, photoUrl }: { nom: string; photoUrl: string | null }) {
  const src = resolveAssetUrl(photoUrl);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={nom} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
      {initials(nom)}
    </span>
  );
}
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
  const [poste, setPoste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingPosteId, setEditingPosteId] = useState<string | null>(null);
  const [posteDraft, setPosteDraft] = useState('');
  const [savingPoste, setSavingPoste] = useState(false);

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
      const result = await addOrganisationMembre({ email, nom, poste: poste || undefined });
      const message =
        result.status === 'added'
          ? `${nom} was added to the organisation.`
          : `Invitation sent to ${email}.`;
      setNotice(message);
      toast(message);
      setEmail('');
      setNom('');
      setPoste('');
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

  function startEditPoste(membre: OrganisationMembre) {
    setEditingPosteId(membre.id);
    setPosteDraft(membre.poste ?? '');
  }

  async function handleSavePoste(membre: OrganisationMembre) {
    setSavingPoste(true);
    try {
      await updateMembrePoste(membre.id, posteDraft || null);
      await load();
      setEditingPosteId(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setSavingPoste(false);
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
          <Button onClick={() => setShowForm((v) => !v)} aria-label={showForm ? 'Cancel' : 'Invite member'} title={showForm ? 'Cancel' : 'Invite member'}>
            {showForm ? '✕' : <ChairIcon className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <Label>
              Full name
              <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
            </Label>
            <Label>
              Email
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Label>
            <Label>
              Job title (optional)
              <Input
                value={poste}
                onChange={(e) => setPoste(e.target.value)}
                maxLength={100}
                placeholder="Chief Technical Officer"
              />
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
          <Loading className="mt-3 text-sm" />
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.email}
                    {inv.poste && ` · ${inv.poste}`}
                  </p>
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
                <div className="flex items-center gap-3">
                  <MemberAvatar nom={m.nom} photoUrl={m.photoUrl} />
                  <div>
                  <p className="text-sm font-medium text-foreground">{m.nom}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                  {editingPosteId === m.id ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        autoFocus
                        value={posteDraft}
                        onChange={(e) => setPosteDraft(e.target.value)}
                        maxLength={100}
                        placeholder="Job title"
                        className="h-7 w-48 text-xs"
                      />
                      <Button size="sm" disabled={savingPoste} onClick={() => handleSavePoste(m)}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={savingPoste}
                        onClick={() => setEditingPosteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    isAdmin && (
                      <button
                        onClick={() => startEditPoste(m)}
                        className="mt-0.5 text-xs text-brand-blue hover:underline"
                      >
                        {m.poste ?? 'Add job title'}
                      </button>
                    )
                  )}
                  {!isAdmin && m.poste && <p className="mt-0.5 text-xs text-muted-foreground">{m.poste}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="validated">Joined</Badge>
                  {m.bureaux.map((b) => (
                    <Badge key={b.bureau.id} tone="neutral">
                      {b.bureau.nom}
                    </Badge>
                  ))}
                  {m.id === user?.organisation.proprietaireId ? (
                    <Badge tone="brand">Owner</Badge>
                  ) : isOwner ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Admin</span>
                      <Toggle
                        checked={m.roleGlobal === 'ADMIN'}
                        disabled={updatingRoleId === m.id}
                        label={`Toggle admin for ${m.nom}`}
                        onChange={() => handleRoleChange(m, m.roleGlobal === 'ADMIN' ? 'MEMBRE' : 'ADMIN')}
                      />
                    </div>
                  ) : (
                    <Badge tone={m.roleGlobal === 'ADMIN' ? 'brand' : 'neutral'}>
                      {m.roleGlobal === 'ADMIN' ? 'Admin' : 'Member'}
                    </Badge>
                  )}
                  {isAdmin && m.id !== user?.organisation.proprietaireId && m.id !== user?.id && (
                    <button
                      disabled={removingId === m.id}
                      onClick={() => handleRemove(m)}
                      aria-label={`Remove ${m.nom}`}
                      title={`Remove ${m.nom}`}
                      className="rounded p-1 text-muted-foreground hover:text-status-review disabled:opacity-50"
                    >
                      <ExitIcon className="h-[18px] w-[18px]" />
                    </button>
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
