'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TaskItem } from '@/components/tasks/task-item';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription } from '@/components/ui/card';
import { getMyTasks, type MyTache } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [taches, setTaches] = useState<MyTache[] | null>(null);

  async function load() {
    setTaches(await getMyTasks());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Tasks' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every task assigned to you, across all offices and your personal Organizer.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          {taches === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : taches.length === 0 ? (
            <CardDescription>Nothing assigned to you yet.</CardDescription>
          ) : (
            user &&
            taches.map((t) => (
              <div key={t.id} className="flex flex-col gap-2">
                <Link
                  href={t.projet.bureau ? `/offices/${t.projet.bureau.id}/tasks` : '/my-organizer'}
                  className="w-fit"
                >
                  <Badge tone={t.projet.bureau ? 'neutral' : 'brand'}>
                    {t.projet.bureau ? t.projet.bureau.nom : 'Personal'}
                  </Badge>
                </Link>
                <TaskItem
                  tache={t}
                  currentUserId={user.id}
                  isManager={false}
                  isAdmin={user.roleGlobal === 'ADMIN'}
                  assignableMembres={[]}
                  onChange={load}
                />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
