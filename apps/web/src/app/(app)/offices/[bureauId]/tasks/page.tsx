'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { TaskItem } from '@/components/tasks/task-item';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription } from '@/components/ui/card';
import { getBureau, listBureauTaches, type BureauDetail, type Tache } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function groupBySubject(taches: Tache[]) {
  const groups = new Map<string, { nom: string; taches: Tache[] }>();
  for (const t of taches) {
    const key = t.conversation?.id ?? 'none';
    const nom = t.conversation?.nom ?? 'No subject';
    if (!groups.has(key)) groups.set(key, { nom, taches: [] });
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

export default function TasksPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);

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

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isManager =
    isAdmin || bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') || false;

  if (!taches || !bureau) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const groups = groupBySubject(taches);

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">{taches.length} task(s) in this office.</p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      {taches.length === 0 ? (
        <Card>
          <CardDescription>Nothing yet.</CardDescription>
        </Card>
      ) : (
        groups.map((g) => {
          const { termine, enCours, nonCommence } = breakdown(g.taches);
          return (
            <Card key={g.nom} id={`subject-${g.nom}`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {g.nom} ({g.taches.length} task{g.taches.length > 1 ? 's' : ''})
                </h2>
                <p className="text-xs text-muted-foreground">
                  {enCours} in progress · {termine} done · {nonCommence} not started
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {user &&
                  g.taches.map((t) => (
                    <TaskItem
                      key={t.id}
                      tache={t}
                      currentUserId={user.id}
                      isManager={isManager}
                      isAdmin={isAdmin}
                      assignableMembres={bureau.membres}
                      onChange={load}
                    />
                  ))}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
