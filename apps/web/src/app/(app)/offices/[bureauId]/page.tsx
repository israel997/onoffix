'use client';

import { Loading } from '@/components/ui/loading';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BureauChat } from '@/components/chat/bureau-chat';
import { ChairIcon, ChartIcon, ExitIcon, GroupIcon } from '@/components/icons/office-icons';
import { MembreStatsModal } from '@/components/offices/membre-stats-modal';
import { OfficeNav } from '@/components/offices/office-nav';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addMembre,
  cancelBureauInvitation,
  getBureau,
  getBureauStats,
  listBureauInvitations,
  listOrganisationMembres,
  removeMembre,
  updateMembre,
  type BureauDetail,
  type BureauInvitation,
  type BureauStats,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function OfficeDetailPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();
  const toast = useToast();

  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [orgMembres, setOrgMembres] = useState<OrganisationMembre[] | null>(null);
  const [invitations, setInvitations] = useState<BureauInvitation[]>([]);
  const [stats, setStats] = useState<BureauStats | null>(null);
  const [statsMember, setStatsMember] = useState<{ id: string; nom: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [roleInterne, setRoleInterne] = useState('');
  const [roleDansBureau, setRoleDansBureau] = useState<'COLLABORATEUR' | 'MANAGER'>('COLLABORATEUR');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const isManagerOf = (b: BureauDetail | null) =>
    user?.roleGlobal === 'ADMIN' || b?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER');

  async function load() {
    const [bureauData, membresData, statsData] = await Promise.all([
      getBureau(bureauId),
      listOrganisationMembres(),
      getBureauStats(bureauId),
    ]);
    setBureau(bureauData);
    setOrgMembres(membresData);
    setStats(statsData);
    if (isManagerOf(bureauData)) {
      setInvitations(await listBureauInvitations(bureauId));
    } else {
      setInvitations([]);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Un collaborateur qui accepte une invitation ailleurs (ou sur un autre onglet)
    // ne déclenche rien ici — on repasse périodiquement pour refléter les changements
    // sans obliger à recharger la page manuellement.
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  const isManager = isManagerOf(bureau);

  const availableMembres = useMemo(() => {
    if (!bureau || !orgMembres) return [];
    const alreadyIn = new Set([
      ...bureau.membres.map((m) => m.user.id),
      ...invitations.map((inv) => inv.user.id),
    ]);
    return orgMembres.filter((m) => !alreadyIn.has(m.id));
  }, [bureau, orgMembres, invitations]);

  async function handleCancelInvitation(invitationId: string) {
    setCancellingId(invitationId);
    try {
      await cancelBureauInvitation(bureauId, invitationId);
      toast('Invitation cancelled');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setCancellingId(null);
    }
  }

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
      toast('Invitation sent — they need to accept before joining.');
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

  if (!bureau) return <Loading className="text-sm" />;

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

      {bureau.niveauAlerte !== 'AUCUNE' && (
        <div
          className={`rounded-xl px-4 py-3 text-center text-sm font-semibold text-white ${bureau.niveauAlerte === 'ROUGE' ? 'bg-status-review' : 'bg-status-declared'}`}
        >
          {bureau.niveauAlerte === 'ROUGE' ? 'This Office is on fire' : 'This office is on alert!'}
        </div>
      )}

      <OfficeNav bureauId={bureauId} showSettings={!!isManager} />

      {stats && (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <ChartIcon className="h-5 w-5 text-brand-blue" />
            Team stats
          </CardTitle>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-6">
            <div>
              <p className="text-lg font-bold text-foreground">{stats.totalTaches}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {stats.progression === null ? '—' : `${stats.progression}%`}
              </p>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.tachesEnCours}</p>
              <p className="text-xs text-muted-foreground">In progress</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.tachesTerminees}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.tachesBloquees}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {stats.respectDeadlines === null ? '—' : `${stats.respectDeadlines}%`}
              </p>
              <p className="text-xs text-muted-foreground">Deadlines met</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GroupIcon className="h-5 w-5 text-brand-blue" />
              Members
            </CardTitle>
            <CardDescription>{bureau.membres.length} people in this office.</CardDescription>
          </div>
          {isManager && (
            <Button
              size="sm"
              onClick={() => setShowForm((v) => !v)}
              aria-label={showForm ? 'Cancel' : 'Add member'}
              title={showForm ? 'Cancel' : 'Add member'}
            >
              {showForm ? '✕' : <ChairIcon className="h-4 w-4" />}
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
              <button
                className="text-left"
                onClick={() => setStatsMember({ id: m.user.id, nom: m.user.nom })}
              >
                <p className="text-sm font-medium text-foreground hover:underline">{m.user.nom}</p>
                <p className="text-xs text-muted-foreground">{m.user.email}</p>
              </button>
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
                  <button
                    onClick={() => handleRemove(m.user.id)}
                    aria-label={`Remove ${m.user.nom}`}
                    title={`Remove ${m.user.nom}`}
                    className="rounded p-1 text-muted-foreground hover:text-status-review"
                  >
                    <ExitIcon className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {isManager &&
            invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.user.nom}</p>
                  <p className="text-xs text-muted-foreground">{inv.user.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="declared">Pending</Badge>
                  <Badge tone="neutral">{inv.roleDansBureau === 'MANAGER' ? 'Manager' : 'Collaborator'}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancellingId === inv.id}
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          {bureau.membres.length === 0 && invitations.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No member yet.</p>
          )}
        </div>
      </Card>

      <BureauChat
        bureauId={bureauId}
        mentionableUsers={bureau.membres.map((m) => ({ id: m.user.id, nom: m.user.nom }))}
        couleur={bureau.couleur}
      />

      {statsMember && (
        <MembreStatsModal
          userId={statsMember.id}
          nom={statsMember.nom}
          onClose={() => setStatsMember(null)}
        />
      )}
    </div>
  );
}
