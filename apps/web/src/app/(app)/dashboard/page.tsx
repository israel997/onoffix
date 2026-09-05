'use client';

import { Skeleton } from '@/components/ui/skeleton';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTaskRow } from '@/components/dashboard/alert-task-row';
import { CurrentPlanModal } from '@/components/dashboard/current-plan-modal';
import { DashboardHeading } from '@/components/dashboard/dashboard-heading';
import { RotatingSubtitle } from '@/components/dashboard/rotating-subtitle';
import {
  AlarmIcon,
  BriefcaseIcon,
  BuildingIcon,
  ChairIcon,
  DeskIcon,
  StairsIcon,
} from '@/components/icons/office-icons';
import { TasksTab } from '@/components/my-space/tasks-tab';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAlertes,
  getOrganisation,
  getOrganisationStats,
  listBureaux,
  type Alertes,
  type Bureau,
  type Organisation,
  type OrganisationStats,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getPlan, planKeyFromAbonnement } from '@/lib/plans';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrganisationStats | null>(null);
  const [alertes, setAlertes] = useState<Alertes | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [bureaux, setBureaux] = useState<Bureau[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const loadAlertes = useCallback(() => {
    getAlertes().then(setAlertes);
  }, []);

  useEffect(() => {
    getOrganisationStats().then(setStats);
    getOrganisation().then(setOrganisation);
    listBureaux().then(setBureaux);
    loadAlertes();
  }, [loadAlertes]);

  const planKey = planKeyFromAbonnement(organisation?.planAbonnement);
  const plan = getPlan(planKey);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <DashboardHeading name={user.nom.split(' ')[0]} bureaux={bureaux} />
        <RotatingSubtitle
          className="mt-1.5 text-base font-medium text-foreground"
          lines={['Know exactly how your team is progressing on their tasks.']}
        />
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

      {alertes && alertes.bureauxEnAlerte.length > 0 && (
        <Card>
          <CardTitle className="flex items-center gap-2 text-status-review">
            <AlarmIcon className="h-5 w-5" />
            Offices in alert
          </CardTitle>
          <div className="mt-2 flex flex-col divide-y divide-border">
            {alertes.bureauxEnAlerte.map((b) => (
              <Link
                key={b.id}
                href={`/offices/${b.id}`}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-surface-muted"
              >
                <span className="font-medium text-foreground">{b.nom}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                    b.niveauAlerte === 'ROUGE' ? 'bg-status-review' : 'bg-status-declared'
                  }`}
                >
                  {b.niveauAlerte === 'ROUGE' ? 'Red' : 'Orange'}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

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
          <div className="mt-3 flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16 shrink-0" />
              </div>
            ))}
          </div>
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

      <div className="grid gap-4 sm:grid-cols-3">
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
              <CardDescription>Your private BrainDumper.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <button onClick={() => setShowPlanModal(true)} className="h-full text-left">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StairsIcon className="h-5 w-5 text-brand-blue" />
                {plan.name} plan
              </CardTitle>
              <CardDescription>
                {planKey === 'scale' ? "You're on our top plan." : 'See what upgrading unlocks.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </button>
      </div>

      {showPlanModal && <CurrentPlanModal planKey={planKey} onClose={() => setShowPlanModal(false)} />}

      <div>
        <h2 className="text-lg font-bold text-foreground">All your tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every task assigned to you, across every office.</p>
      </div>
      <TasksTab />
    </div>
  );
}
