'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlarmIcon } from '@/components/icons/office-icons';
import { TasksTab } from '@/components/my-space/tasks-tab';
import { TodayChecklist } from '@/components/rituel/today-checklist';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { listBureaux, type Bureau } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function CheckInPage() {
  const { user } = useAuth();
  const [allBureaux, setAllBureaux] = useState<Bureau[] | null>(null);
  const isAdmin = user?.roleGlobal === 'ADMIN';

  useEffect(() => {
    if (isAdmin) listBureaux().then(setAllBureaux);
  }, [isAdmin]);

  if (!user) return null;

  // Un admin gère implicitement tous les bureaux, même ceux dont il n'est pas membre —
  // pour les autres, la liste vient directement de son propre rôle par bureau (pas d'appel API).
  const managedBureaux = isAdmin
    ? (allBureaux ?? []).map((b) => ({ id: b.id, nom: b.nom }))
    : user.bureaux.filter((b) => b.roleDansBureau === 'MANAGER').map((b) => b.bureau);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Daily check-in' }]} />
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <AlarmIcon className="h-6 w-6 text-brand-blue" />
          Daily check-in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Declare what you got done today.</p>
      </div>

      <TodayChecklist />

      {managedBureaux.length > 0 && (
        <Card>
          <CardTitle>Your teams&apos; check-in</CardTitle>
          <CardDescription>Review and confirm what each collaborator got done today.</CardDescription>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {managedBureaux.map((b) => (
              <Link
                key={b.id}
                href={`/offices/${b.id}/today`}
                className="flex items-center justify-between py-2.5 text-sm text-foreground hover:text-brand-blue"
              >
                {b.nom}
                <span className="text-xs text-muted-foreground">View →</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground">All your tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every task assigned to you, across every office.</p>
      </div>
      <TasksTab />
    </div>
  );
}
