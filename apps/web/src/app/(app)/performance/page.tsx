'use client';

import { Skeleton } from '@/components/ui/skeleton';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronIcon, ChartIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getBureauClassement,
  getBureauEvolution,
  getMembreEvolution,
  getMembreJournal,
  getMembreStats,
  listBureaux,
  listOrganisationMembres,
  type ClassementEntry,
  type EvolutionPoint,
  type JournalJour,
  type MembreStats,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function EvolutionCharts({ data }: { data: EvolutionPoint[] }) {
  if (data.length === 0) return <EmptyState>No data for this range.</EmptyState>;
  const rows = data.map((p) => ({ ...p, label: formatDay(p.date) }));
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {(
        [
          { key: 'tachesValidees', title: 'Tasks completed', color: '#16a34a' },
          { key: 'heures', title: 'Hours worked', color: '#0b63f6' },
        ] as const
      ).map(({ key, title, color }) => (
        <div key={key}>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">{title}</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e7f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={key === 'heures'} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
}

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

  const [journal, setJournal] = useState<JournalJour[] | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

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

  const [evolution, setEvolution] = useState<EvolutionPoint[] | null>(null);
  const [bureauEvolution, setBureauEvolution] = useState<EvolutionPoint[] | null>(null);

  useEffect(() => {
    if (!targetUserId) return;
    getMembreStats(targetUserId, { from, to }).then(setStats);
    getMembreJournal(targetUserId, from, to).then(setJournal);
    getMembreEvolution(targetUserId, from, to).then(setEvolution).catch(() => setEvolution([]));
  }, [targetUserId, from, to]);

  useEffect(() => {
    if (!bureauId || !isAdmin) return;
    getBureauEvolution(bureauId, from, to)
      .then(setBureauEvolution)
      .catch(() => setBureauEvolution([]));
  }, [bureauId, from, to, isAdmin]);

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
        <Card>
          <Skeleton className="h-4 w-16" />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </Card>
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

      <Card>
        <CardTitle>Evolution</CardTitle>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Day-by-day, over the selected range.</p>
        {evolution === null ? (
          <Skeleton className="h-44 w-full" />
        ) : (
          <EvolutionCharts data={evolution} />
        )}
      </Card>

      {isAdmin && bureauId && (
        <Card>
          <CardTitle>Office evolution</CardTitle>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Selected office, day-by-day over the range.
          </p>
          {bureauEvolution === null ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <EvolutionCharts data={bureauEvolution} />
          )}
        </Card>
      )}

      <Card>
        <CardTitle>Daily activity</CardTitle>
        {journal === null ? (
          <div className="mt-3 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {journal.map((jour) => {
              const open = openDay === jour.date;
              return (
                <div key={jour.date}>
                  <button
                    onClick={() => setOpenDay((prev) => (prev === jour.date ? null : jour.date))}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronIcon
                        className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
                      />
                      <span className="text-foreground">{formatDay(jour.date)}</span>
                    </span>
                    <span
                      className={jour.taches.length > 0 ? 'font-semibold text-status-validated' : 'text-muted-foreground'}
                    >
                      {jour.taches.length} task{jour.taches.length === 1 ? '' : 's'}
                    </span>
                  </button>
                  {open && (
                    <div className="flex flex-col gap-1 pb-3 pl-5">
                      {jour.taches.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nothing completed this day.</p>
                      ) : (
                        jour.taches.map((t) => (
                          <p key={t.id} className="text-sm text-foreground">
                            {t.titre}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
            <div className="mt-3 flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
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
                    <span className="font-semibold text-foreground">
                      {entry.tachesValidees} completed
                    </span>
                    <span>
                      {entry.respectDeadlines === null ? '-' : `${entry.respectDeadlines}% on time`}
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
