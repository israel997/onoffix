'use client';

import { Loading } from '@/components/ui/loading';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTaskRow } from '@/components/dashboard/alert-task-row';
import {
  AlarmIcon,
  BriefcaseIcon,
  BuildingIcon,
  ChairIcon,
  DeskIcon,
  ReceptionIcon,
} from '@/components/icons/office-icons';
import { TasksTab } from '@/components/my-space/tasks-tab';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAlertes, getOrganisationStats, type Alertes, type OrganisationStats } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrganisationStats | null>(null);
  const [alertes, setAlertes] = useState<Alertes | null>(null);

  const loadAlertes = useCallback(() => {
    getAlertes().then(setAlertes);
  }, []);

  useEffect(() => {
    getOrganisationStats().then(setStats);
    loadAlertes();
  }, [loadAlertes]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <ReceptionIcon className="h-6 w-6 text-brand-blue" />
          Welcome, {user.nom.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Know exactly how your team is progressing on their tasks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
        <Card className="flex items-center gap-3">
          <ChairIcon className="h-7 w-7 shrink-0 text-brand-blue" />
          <div>
            <p className="text-2xl font-bold text-foreground">{stats?.membresCount ?? '-'}</p>
            <p className="text-sm text-muted-foreground">Members</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <BriefcaseIcon className="h-7 w-7 shrink-0 text-brand-blue" />
          <div>
            <p className="text-2xl font-bold text-foreground">{stats?.tachesCount ?? '-'}</p>
            <p className="text-sm text-muted-foreground">Tasks</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlarmIcon className="h-5 w-5 text-muted-foreground" />
            Needs your attention
          </CardTitle>
          {alertes && (
            <span className="text-xs text-muted-foreground">
              {alertes.okCount} task{alertes.okCount === 1 ? '' : 's'} on track
            </span>
          )}
        </div>
        {alertes === null ? (
          <Loading className="mt-3 text-sm" />
        ) : alertes.attention.length === 0 ? (
          <p className="mt-3 text-sm text-status-validated">
            {alertes.totalCount === 0
              ? 'No open tasks to watch - nothing to show yet.'
              : "Everything's on track. Nothing needs your attention."}
          </p>
        ) : (
          <div className="mt-1 flex flex-col divide-y divide-border">
            {alertes.attention.map((tache) => (
              <AlertTaskRow key={tache.id} tache={tache} currentUserId={user.id} onReassigned={loadAlertes} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/offices">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BuildingIcon className="h-5 w-5 text-brand-blue" />
                Offices
              </CardTitle>
              <CardDescription>Manage your teams and their members.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/my-space">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DeskIcon className="h-5 w-5 text-brand-blue" />
                My Space
              </CardTitle>
              <CardDescription>Your private Organizer.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground">All your tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every task assigned to you, across every office.</p>
      </div>
      <TasksTab />
    </div>
  );
}
