'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
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
      <polygon
        points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PasswordPrompt {
  title: string;
  description: string;
  run: (password: string) => Promise<void>;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [organisations, setOrganisations] = useState<AdminOrganisation[] | null>(null);
  const [membres, setMembres] = useState<AdminMembre[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPrompt | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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

  function askPassword(title: string, description: string, run: (password: string) => Promise<void>) {
    setPasswordValue('');
    setPasswordError(null);
    setPasswordPrompt({ title, description, run });
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (!passwordPrompt) return;
    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      await passwordPrompt.run(passwordValue);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handlePromote(m: AdminMembre) {
    await withBusy(m.userId, () => adminPromote(m.userId), `${m.nom} is now an admin`);
  }

  function handleDeleteAccount(m: AdminMembre) {
    askPassword(
      `Delete ${m.nom}'s account?`,
      'This permanently deletes their account and every membership, across all organisations. This cannot be undone. Enter the admin password to confirm.',
      async (password) => {
        setBusyId(m.accountId);
        try {
          await adminDeleteAccount(m.accountId, password);
          await load();
          toast(`${m.nom}'s account was deleted`);
          setPasswordPrompt(null);
        } finally {
          setBusyId(null);
        }
      },
    );
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

  function handleDeleteOrganisation(org: AdminOrganisation) {
    askPassword(
      `Delete ${org.nom}?`,
      'This permanently deletes the organisation and all its data (bureaux, projects, tasks, messages). Any member account left with no other organisation is deleted too. This cannot be undone. Enter the admin password to confirm.',
      async (password) => {
        setBusyId(org.id);
        try {
          await adminDeleteOrganisation(org.id, password);
          await load();
          toast(`${org.nom} was deleted`);
          setPasswordPrompt(null);
        } finally {
          setBusyId(null);
        }
      },
    );
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
                  <Button
                    variant="danger"
                    size="sm"
                    className="px-2"
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
            {organisations.length === 0 && <CardDescription>No organisation yet.</CardDescription>}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Members</CardTitle>
        {membres === null ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : membres.length === 0 ? (
          <CardDescription className="mt-3">No member yet.</CardDescription>
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
                        {m.roleGlobal === 'ADMIN' ? 'Admin' : 'Member'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(m.dateInscription)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.pays ?? '—'}</td>
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
                            variant="warning"
                            size="sm"
                            className="px-2"
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
                            variant="danger"
                            size="sm"
                            className="px-2"
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

      {passwordPrompt && (
        <Modal onClose={() => !passwordSubmitting && setPasswordPrompt(null)}>
          <h2 className="text-lg font-bold text-foreground">{passwordPrompt.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{passwordPrompt.description}</p>
          <form onSubmit={submitPassword} className="mt-4 flex flex-col gap-3">
            <Label>
              Admin password
              <Input
                type="password"
                autoFocus
                required
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
              />
            </Label>
            {passwordError && <p className="text-sm text-status-review">{passwordError}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={passwordSubmitting}
                onClick={() => setPasswordPrompt(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="sm" disabled={passwordSubmitting}>
                {passwordSubmitting ? 'Confirming…' : 'Confirm'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
