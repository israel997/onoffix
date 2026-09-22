'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlarmIcon } from '@/components/icons/office-icons';
import { ValidationsToday } from '@/components/rituel/validations-today';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListSkeleton } from '@/components/ui/skeleton';
import { getBureauxAValider, type BureauAValider } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getCached, setCached } from '@/lib/page-cache';

const VALIDATIONS_CACHE_KEY = 'validations-a-valider';

export default function ValidationsPage() {
  const { user } = useAuth();
  const isManager = user?.roleGlobal === 'ADMIN' || user?.roleGlobal === 'MANAGER';
  const [bureaux, setBureaux] = useState<BureauAValider[] | null>(
    getCached<BureauAValider[]>(VALIDATIONS_CACHE_KEY) ?? null,
  );

  useEffect(() => {
    if (isManager) {
      getBureauxAValider().then((data) => {
        setBureaux(data);
        setCached(VALIDATIONS_CACHE_KEY, data);
      });
    }
  }, [isManager]);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Validations' }]} />
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
          <AlarmIcon className="h-6 w-6 text-brand-blue" />
          Validations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review what got done across your offices today.
        </p>
      </div>

      {isManager && (
        <Card>
          <CardTitle>Your teams&apos; Check-In</CardTitle>
          <CardDescription>
            Offices with a task in progress or waiting for your validation — quiet offices aren&apos;t
            shown.
          </CardDescription>
          {bureaux === null ? (
            <div className="mt-3">
              <ListSkeleton rows={2} />
            </div>
          ) : bureaux.length === 0 ? (
            <div className="mt-3">
              <EmptyState>Nothing in progress or waiting for validation right now.</EmptyState>
            </div>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {bureaux.map((b) => (
                <Link
                  key={b.id}
                  href={`/offices/${b.id}/check-in`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm text-foreground hover:text-brand-blue"
                >
                  <span className="min-w-0 truncate">{b.nom}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {b.enCours > 0 && <Badge tone="brand">{b.enCours} in progress</Badge>}
                    {b.aValider > 0 && <Badge tone="declared">{b.aValider} to validate</Badge>}
                    <span className="text-xs text-muted-foreground">View →</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground">Validated today</h2>
        <p className="mt-1 text-sm text-muted-foreground">Who got a task done today, across your offices.</p>
      </div>
      <ValidationsToday />
    </div>
  );
}
