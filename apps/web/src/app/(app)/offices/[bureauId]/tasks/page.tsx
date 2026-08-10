'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { TaskItem } from '@/components/tasks/task-item';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription } from '@/components/ui/card';
import { getBureau, getBureauOrganizer, type BureauDetail, type OrganizerDetail } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function TasksPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);

  async function load() {
    const [org, bur] = await Promise.all([getBureauOrganizer(bureauId), getBureau(bureauId)]);
    setOrganizer(org);
    setBureau(bur);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  const isManager =
    user?.roleGlobal === 'ADMIN' ||
    bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') ||
    false;

  if (!organizer || !bureau) return <p className="text-sm text-muted-foreground">Loading…</p>;

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
        <p className="mt-1 text-sm text-muted-foreground">{organizer.taches.length} task(s) in this office.</p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      <Card>
        <div className="flex flex-col gap-2">
          {organizer.taches.length === 0 ? (
            <CardDescription>Nothing yet.</CardDescription>
          ) : (
            user &&
            organizer.taches.map((t) => (
              <TaskItem
                key={t.id}
                tache={t}
                currentUserId={user.id}
                isManager={isManager}
                assignableMembres={bureau.membres}
                onChange={load}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
