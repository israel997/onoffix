'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  adminListMembers,
  adminListOrganisations,
  adminPromote,
  adminSetBanned,
  adminSetRestricted,
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

  async function handleBan(m: AdminMembre) {
    const ok = await confirmDialog({
      title: `Ban ${m.nom}?`,
      description: 'This immediately blocks all login for this account, across every organisation.',
      confirmLabel: 'Ban',
      danger: true,
    });
    if (!ok) return;
    await withBusy(m.accountId, () => adminSetBanned(m.accountId, true), `${m.nom} was banned`);
  }

  async function handleUnban(m: AdminMembre) {
    await withBusy(m.accountId, () => adminSetBanned(m.accountId, false), `${m.nom} was unbanned`);
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

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
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
        <h1 className="text-2xl font-bold text-foreground">Platform admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">All organisations and members across OOffix.</p>
      </div>

      <Card>
        <CardTitle>Organisations</CardTitle>
        {organisations === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {organisations.map((org) => (
              <div key={org.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{org.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    Owner: {org.proprietaire ? `${org.proprietaire.nom} (${org.proprietaire.email})` : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{org.membresCount} member{org.membresCount === 1 ? '' : 's'}</Badge>
                  <Badge tone="neutral">Created {formatDate(org.dateCreation)}</Badge>
                </div>
              </div>
            ))}
            {organisations.length === 0 && <CardDescription>No organisation yet.</CardDescription>}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Members</CardTitle>
        {membres === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {membres.map((m) => (
              <div
                key={m.userId}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.nom} <span className="font-normal text-muted-foreground">— {m.organisationNom}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · Joined {formatDate(m.dateInscription)} · {m.pays ?? 'Unknown country'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={m.roleGlobal === 'ADMIN' ? 'brand' : 'neutral'}>
                    {m.roleGlobal === 'ADMIN' ? 'Admin' : 'Member'}
                  </Badge>
                  {m.banned && <Badge tone="review">Banned</Badge>}
                  {m.restricted && <Badge tone="declared">Restricted</Badge>}

                  {m.roleGlobal !== 'ADMIN' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === m.userId}
                      onClick={() => handlePromote(m)}
                    >
                      Make admin
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
                      disabled={busyId === m.accountId}
                      onClick={() => handleRestrict(m)}
                    >
                      Restrict
                    </Button>
                  )}
                  {m.banned ? (
                    <Button variant="ghost" size="sm" disabled={busyId === m.accountId} onClick={() => handleUnban(m)}>
                      Unban
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled={busyId === m.accountId} onClick={() => handleBan(m)}>
                      Ban
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {membres.length === 0 && <CardDescription>No member yet.</CardDescription>}
          </div>
        )}
      </Card>
    </div>
  );
}
