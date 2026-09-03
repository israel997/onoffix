'use client';

import { ListSkeleton, PageSkeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import { GearIcon } from '@/components/icons/office-icons';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminDeleteAccount,
  adminDeleteOrganisation,
  adminListMembers,
  adminListOrganisations,
  adminPromote,
  adminSetRestricted,
  adminUnban,
  type AdminMembre,
  type AdminOrganisation,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

const SUPER_ADMIN_EMAIL = 'israellawani.pro@gmail.com';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [organisations, setOrganisations] = useState<AdminOrganisation[] | null>(null);
  const [membres, setMembres] = useState<AdminMembre[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const authorized = user?.email === SUPER_ADMIN_EMAIL;

  async function load() {
    const [orgsData, membresData] = await Promise.all([adminListOrganisations(), adminListMembers()]);
    setOrganisations(orgsData);
    setMembres(membresData);
  }

  useEffect(() => {
    if (authorized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load();
    }
  }, [authorized]);

  async function withBusy(id: string, action: () => Promise<unknown>, successMessage: string) {
    setBusyId(id);
    try {
      await action();
      await load();
      toast(successMessage);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePromote(m: AdminMembre) {
    await withBusy(m.userId, () => adminPromote(m.userId), `${m.nom} is now an admin`);
  }

  async function handleDeleteAccount(m: AdminMembre) {
    const ok = await confirmDialog({
      title: `Delete ${m.nom}'s account?`,
      description: 'This permanently deletes their account and every membership, across all organisations.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await withBusy(m.accountId, () => adminDeleteAccount(m.accountId), `${m.nom}'s account was deleted`);
  }

  async function handleUnban(m: AdminMembre) {
    await withBusy(m.accountId, () => adminUnban(m.accountId), `${m.nom} was unbanned`);
  }

  async function handleRestrict(m: AdminMembre) {
    await withBusy(
      m.accountId,
      () => adminSetRestricted(m.accountId, true),
      `${m.nom} is now restricted to read-only`,
    );
  }

  async function handleUnrestrict(m: AdminMembre) {
    await withBusy(m.accountId, () => adminSetRestricted(m.accountId, false), `${m.nom} is no longer restricted`);
  }

  async function handleDeleteOrganisation(org: AdminOrganisation) {
    const ok = await confirmDialog({
      title: `Delete ${org.nom}?`,
      description:
        'This permanently deletes the organisation and all its data (bureaux, projects, tasks, messages). Any member account left with no other organisation is deleted too.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await withBusy(org.id, () => adminDeleteOrganisation(org.id), `${org.nom} was deleted`);
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!authorized) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }]} />
        <Card>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>This page is reserved for the OOffix platform administrator.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }]} />
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <GearIcon className="h-6 w-6 text-brand-blue" />
          Platform admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">All organisations and members across OOffix.</p>
      </div>

      <Card>
        <CardTitle>Organisations</CardTitle>
        {organisations === null ? (
          <ListSkeleton rows={2} />
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {organisations.map((org) => (
              <div key={org.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{org.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    Owner: {org.proprietaire ? `${org.proprietaire.nom} (${org.proprietaire.email})` : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{org.membresCount} member{org.membresCount === 1 ? '' : 's'}</Badge>
                  <Badge tone="neutral">Created {formatDate(org.dateCreation)}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-status-review hover:bg-status-review/10"
                    aria-label="Delete organisation"
                    title="Delete organisation"
                    disabled={busyId === org.id}
                    onClick={() => handleDeleteOrganisation(org)}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            ))}
            {organisations.length === 0 && <EmptyState>No organisation yet.</EmptyState>}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Members</CardTitle>
        {membres === null ? (
          <ListSkeleton rows={3} />
        ) : membres.length === 0 ? (
          <EmptyState className="mt-3">No member yet.</EmptyState>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Organisation</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Registered</th>
                  <th className="py-2 pr-4 font-medium">Country</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {membres.map((m) => (
                  <tr key={m.userId}>
                    <td className="py-3 pr-4 font-medium text-foreground">{m.nom}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.organisationNom}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={m.roleGlobal === 'ADMIN' ? 'brand' : 'neutral'}>
                        {m.roleGlobal === 'ADMIN' ? 'Authority' : m.roleGlobal === 'MANAGER' ? 'Manager' : 'Collaborator'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(m.dateInscription)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.pays ?? '-'}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {m.banned && <Badge tone="review">Banned</Badge>}
                        {m.restricted && <Badge tone="declared">Restricted</Badge>}
                        {!m.banned && !m.restricted && <Badge tone="validated">Active</Badge>}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {m.roleGlobal !== 'ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === m.userId}
                            onClick={() => handlePromote(m)}
                          >
                            Make Authority
                          </Button>
                        )}
                        {m.restricted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === m.accountId}
                            onClick={() => handleUnrestrict(m)}
                          >
                            Unrestrict
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 text-status-declared hover:bg-status-declared/10"
                            aria-label="Restrict account"
                            title="Restrict account"
                            disabled={busyId === m.accountId}
                            onClick={() => handleRestrict(m)}
                          >
                            <StopIcon />
                          </Button>
                        )}
                        {m.banned ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === m.accountId}
                            onClick={() => handleUnban(m)}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 text-status-review hover:bg-status-review/10"
                            aria-label="Delete account"
                            title="Delete account"
                            disabled={busyId === m.accountId}
                            onClick={() => handleDeleteAccount(m)}
                          >
                            <TrashIcon />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
