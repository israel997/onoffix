'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { TaskItem } from '@/components/tasks/task-item';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription } from '@/components/ui/card';
import { getBureau, listBureauTaches, type BureauDetail, type StatutTache, type Tache } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Group {
  conversationId: string | null;
  nom: string;
  taches: Tache[];
}

function groupBySubject(taches: Tache[]): Group[] {
  const groups = new Map<string, Group>();
  for (const t of taches) {
    const key = t.conversation?.id ?? 'none';
    const nom = t.conversation?.nom ?? 'No subject';
    if (!groups.has(key)) groups.set(key, { conversationId: t.conversation?.id ?? null, nom, taches: [] });
    groups.get(key)!.taches.push(t);
  }
  return Array.from(groups.values());
}

function breakdown(taches: Tache[]) {
  const termine = taches.filter((t) => t.statut === 'VALIDE').length;
  const nonCommence = taches.filter((t) => t.statut === 'A_FAIRE').length;
  const enCours = taches.length - termine - nonCommence;
  return { termine, enCours, nonCommence };
}

type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'UNASSIGNED' | 'DECLARE' | 'VALIDE';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
  { value: 'DECLARE', label: 'Waiting for validation' },
  { value: 'VALIDE', label: 'Done' },
];

const IN_PROGRESS_STATUSES: StatutTache[] = ['ACCEPTEE', 'EN_COURS', 'A_REVOIR'];

function applyFilter(taches: Tache[], filter: StatusFilter) {
  switch (filter) {
    case 'IN_PROGRESS':
      return taches.filter((t) => IN_PROGRESS_STATUSES.includes(t.statut));
    case 'UNASSIGNED':
      return taches.filter((t) => !t.assigneAId);
    case 'DECLARE':
      return taches.filter((t) => t.statut === 'DECLARE');
    case 'VALIDE':
      return taches.filter((t) => t.statut === 'VALIDE');
    default:
      return taches;
  }
}

export default function TasksPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  async function load() {
    const [t, bur] = await Promise.all([listBureauTaches(bureauId), getBureau(bureauId)]);
    setTaches(t);
    setBureau(bur);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isManager =
    isAdmin || bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') || false;

  if (!taches || !bureau) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const filtered = applyFilter(taches, statusFilter);
  const groups = groupBySubject(filtered);
  const moveTargets = groupBySubject(taches).map((g) => ({ conversationId: g.conversationId, nom: g.nom }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Tasks' },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">{taches.length} task(s) in this office.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      {taches.length === 0 ? (
        <Card>
          <CardDescription>Nothing yet.</CardDescription>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardDescription>No task matches this filter.</CardDescription>
        </Card>
      ) : (
        groups.map((g) => {
          const key = g.conversationId ?? 'none';
          const { termine, enCours, nonCommence } = breakdown(g.taches);
          const open = openGroups.has(key);
          return (
            <Card key={key} id={`subject-${g.nom}`}>
              <button
                onClick={() => toggleGroup(key)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <h2 className="text-sm font-semibold text-foreground">
                    {g.nom} ({g.taches.length} task{g.taches.length > 1 ? 's' : ''})
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  {enCours} in progress · {termine} done · {nonCommence} not started
                </p>
              </button>
              {open && (
                <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {user &&
                    g.taches.map((t) => (
                      <TaskItem
                        key={t.id}
                        tache={t}
                        currentUserId={user.id}
                        isManager={isManager}
                        isAdmin={isAdmin}
                        assignableMembres={bureau.membres}
                        moveTargets={moveTargets.filter((m) => m.conversationId !== g.conversationId)}
                        onChange={load}
                      />
                    ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
