'use client';

import { ListSkeleton, PageSkeleton } from '@/components/ui/skeleton';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { ChairIcon, ExitIcon, KeyIcon } from '@/components/icons/office-icons';
import { MemberDetailPanel } from '@/components/offices/member-detail-panel';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addOrganisationMembre,
  cancelOrganisationInvitation,
  listOrganisationInvitations,
  listOrganisationMembres,
  removeOrganisationMembre,
  resolveAssetUrl,
  transferOwnership,
  updateMembrePoste,
  updateOrganisationMembreRole,
  type Invitation,
  type OrganisationMembre,
} from '@/lib/api';

const ROLE_LABEL: Record<'ADMIN' | 'MANAGER' | 'MEMBRE', string> = {
  ADMIN: 'Authority',
  MANAGER: 'Manager',
  MEMBRE: 'Collaborator',
};

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

function MembersPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const highlightUserId = searchParams.get('userId');
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
  const [detailMembre, setDetailMembre] = useState<OrganisationMembre | null>(null);

  async function load() {
    const [membresData, invitationsData] = await Promise.all([
      listOrganisationMembres(),
      listOrganisationInvitations(),
    ]);
    setMembres(membresData);
    setInvitations(invitationsData);
  }

  // Lien profond depuis ailleurs dans l'app (ex. l'assigné d'une tâche) : ouvre
  // directement le profil visé une fois la liste chargée.
  useEffect(() => {
    if (!highlightUserId || !membres) return;
    const target = membres.find((m) => m.id === highlightUserId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target) setDetailMembre(target);
  }, [highlightUserId, membres]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Un membre ajouté ou une invitation acceptée ailleurs ne déclenche rien ici — on
    // repasse périodiquement pour refléter les changements sans recharger la page.
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
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

  async function handleRoleChange(membre: OrganisationMembre, roleGlobal: 'ADMIN' | 'MANAGER' | 'MEMBRE') {
    setUpdatingRoleId(membre.id);
    setError(null);
    try {
      await updateOrganisationMembreRole(membre.id, roleGlobal);
      await load();
      toast(`${membre.nom} is now ${ROLE_LABEL[roleGlobal]}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast(message, 'error');
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleTransferOwnership(membre: OrganisationMembre) {
    const ok = await confirmDialog({
      title: `Make ${membre.nom} the owner?`,
      description: 'They become the sole owner of this organisation. You keep your Authority access, but lose owner-only actions (deleting the organisation, transferring it again).',
      confirmLabel: 'Transfer ownership',
      danger: true,
    });
    if (!ok) return;
    setUpdatingRoleId(membre.id);
    setError(null);
    try {
      await transferOwnership(membre.id);
      await load();
      toast(`${membre.nom} is now the owner of this organisation`);
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
          <ListSkeleton />
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
              <div key={m.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setDetailMembre(m)}
                    className="flex min-w-0 items-center gap-3 text-left"
                    aria-label={`View ${m.nom}'s profile`}
                  >
                    <MemberAvatar nom={m.nom} photoUrl={m.photoUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground hover:underline">{m.nom}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.id === user?.organisation.proprietaireId ? (
                      <Badge tone="brand">
                        <KeyIcon className="mr-1 inline h-3 w-3 -translate-y-px" />
                        Owner
                      </Badge>
                    ) : isAdmin ? (
                      <>
                        <select
                          value={m.roleGlobal}
                          disabled={updatingRoleId === m.id}
                          onChange={(e) => handleRoleChange(m, e.target.value as 'ADMIN' | 'MANAGER' | 'MEMBRE')}
                          aria-label={`Role for ${m.nom}`}
                          className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
                        >
                          <option value="ADMIN">Authority</option>
                          <option value="MANAGER">Manager</option>
                          <option value="MEMBRE">Collaborator</option>
                        </select>
                        {user?.id === user?.organisation.proprietaireId && (
                          <button
                            onClick={() => handleTransferOwnership(m)}
                            disabled={updatingRoleId === m.id}
                            className="text-xs font-medium text-brand-blue hover:underline disabled:opacity-50"
                          >
                            Make owner
                          </button>
                        )}
                      </>
                    ) : (
                      <Badge tone={m.roleGlobal === 'ADMIN' ? 'brand' : 'neutral'}>{ROLE_LABEL[m.roleGlobal]}</Badge>
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

                <div className="pl-12">
                  {editingPosteId === m.id ? (
                    <div className="flex items-center gap-2">
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
                        className="text-xs text-brand-blue hover:underline"
                      >
                        {m.poste ?? 'Add job title'}
                      </button>
                    )
                  )}
                  {!isAdmin && m.poste && <p className="text-xs text-muted-foreground">{m.poste}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-12">
                  <Badge tone="validated">Joined</Badge>
                  {m.bureaux.slice(0, 3).map((b) => (
                    <Badge key={b.bureau.id} tone="neutral">
                      {b.bureau.nom}
                    </Badge>
                  ))}
                  {m.bureaux.length > 3 && (
                    <button onClick={() => setDetailMembre(m)}>
                      <Badge tone="neutral">+{m.bureaux.length - 3} more</Badge>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {membres.length === 0 && invitations.length === 0 && (
              <EmptyState>No member yet.</EmptyState>
            )}
          </div>
        )}
      </Card>

      {detailMembre && <MemberDetailPanel membre={detailMembre} onClose={() => setDetailMembre(null)} />}
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MembersPageContent />
    </Suspense>
  );
}
