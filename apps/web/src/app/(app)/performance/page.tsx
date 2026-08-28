'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useState } from 'react';
import { ChartIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getBureauClassement,
  getMembreStats,
  listBureaux,
  listOrganisationMembres,
  type ClassementEntry,
  type MembreStats,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function PerformancePage() {
  const { user } = useAuth();
  const isAdmin = user?.roleGlobal === 'ADMIN';

  const [from, setFrom] = useState(() => toISODate(new Date()));
  const [to, setTo] = useState(() => toISODate(new Date()));

  const [members, setMembers] = useState<OrganisationMembre[] | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<MembreStats | null>(null);

  const [officeOptions, setOfficeOptions] = useState<{ id: string; nom: string }[] | null>(null);
  const [bureauId, setBureauId] = useState<string | null>(null);
  const [classement, setClassement] = useState<ClassementEntry[] | null>(null);
  const [classementError, setClassementError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetUserId((prev) => prev ?? user.id);
    if (isAdmin) listOrganisationMembres().then(setMembers);

    // Un admin peut voir le classement de n'importe quel office, même ceux dont il
    // n'est pas membre — les autres ne voient que leurs propres offices.
    if (isAdmin) {
      listBureaux().then((bureaux) => {
        const options = bureaux.map((b) => ({ id: b.id, nom: b.nom }));
        setOfficeOptions(options);
        setBureauId((prev) => prev ?? options[0]?.id ?? null);
      });
    } else {
      const options = user.bureaux.map((b) => b.bureau);
      setOfficeOptions(options);
      setBureauId((prev) => prev ?? options[0]?.id ?? null);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!targetUserId) return;
    getMembreStats(targetUserId, { from, to }).then(setStats);
  }, [targetUserId, from, to]);

  useEffect(() => {
    if (!bureauId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClassementError(null);
    getBureauClassement(bureauId, from, to)
      .then(setClassement)
      .catch((err) => {
        setClassement(null);
        setClassementError(err instanceof Error ? err.message : 'Something went wrong');
      });
  }, [bureauId, from, to]);

  function setRange(days: number) {
    setFrom(toISODate(daysAgo(days)));
    setTo(toISODate(new Date()));
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Performance' }]} />
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <ChartIcon className="h-6 w-6 text-brand-blue" />
          Performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Track progress over any period.</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
            />
          </label>
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => setRange(0)}>
              Today
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRange(6)}>
              7 days
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRange(29)}>
              30 days
            </Button>
          </div>
          {isAdmin && members && (
            <label className="ml-auto flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Member
              <select
                value={targetUserId ?? ''}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === user.id ? `${m.nom} (you)` : m.nom}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Card>

      {stats === null ? (
        <Loading className="text-sm" />
      ) : (
        <Card>
          <CardTitle>Stats</CardTitle>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-lg font-bold text-foreground">{stats.tachesAssignees}</p>
              <p className="text-xs text-muted-foreground">Tasks assigned</p>
            </div>
            <div>
              <p className="text-lg font-bold text-status-validated">{stats.tachesValidees}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-status-declared">{stats.tachesARevoir}</p>
              <p className="text-xs text-muted-foreground">Needs rework</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stats.heuresTravaillees}h</p>
              <p className="text-xs text-muted-foreground">Hours worked</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {stats.tauxDeclarationsATemps === null ? '-' : `${stats.tauxDeclarationsATemps}%`}
              </p>
              <p className="text-xs text-muted-foreground">On-time declarations</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {stats.respectDeadlines === null ? '-' : `${stats.respectDeadlines}%`}
              </p>
              <p className="text-xs text-muted-foreground">Deadlines met</p>
            </div>
            <div>
              <p className="text-lg font-bold text-status-review">{stats.blocagesRencontres}</p>
              <p className="text-xs text-muted-foreground">Blockers</p>
            </div>
          </div>
        </Card>
      )}

      {officeOptions && officeOptions.length > 0 && (
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Reliability leaderboard</CardTitle>
            {officeOptions.length > 1 && (
              <select
                value={bureauId ?? ''}
                onChange={(e) => setBureauId(e.target.value)}
                className="h-9 w-fit rounded-lg border border-border bg-surface px-2 text-sm"
              >
                {officeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nom}
                  </option>
                ))}
              </select>
            )}
          </div>
          {classementError ? (
            <p className="mt-3 text-sm text-muted-foreground">{classementError}</p>
          ) : classement === null ? (
            <Loading className="mt-3 text-sm" />
          ) : classement.length === 0 ? (
            <EmptyState>No data for this period.</EmptyState>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {classement.map((entry, index) => (
                <div key={entry.user.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-center font-bold text-muted-foreground">{index + 1}</span>
                    <span className={entry.user.id === user.id ? 'font-semibold text-brand-blue' : 'text-foreground'}>
                      {entry.user.nom}
                    </span>
                  </span>
                  <span className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{entry.tachesValidees} completed</span>
                    <span className="font-semibold text-foreground">
                      {entry.tauxDeclarationsATemps === null ? '-' : `${entry.tauxDeclarationsATemps}%`}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
