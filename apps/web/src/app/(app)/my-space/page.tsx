'use client';

import { PageSkeleton } from '@/components/ui/skeleton';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { OrganizerTab } from '@/components/my-space/organizer-tab';
import { TasksTab } from '@/components/my-space/tasks-tab';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/cn';

type Tab = 'organizer' | 'tasks';

const TABS: { key: Tab; label: string; description: string }[] = [
  { key: 'organizer', label: 'BrainDumper', description: 'Your private brain dump.' },
  { key: 'tasks', label: 'Tasks', description: 'Tasks from your personal BrainDumper.' },
];

function MySpaceContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'tasks' ? 'tasks' : 'organizer';

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Space' }]} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Space</h1>
        <p className="mt-1 text-sm text-muted-foreground">{TABS.find((t) => t.key === tab)?.description}</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`/my-space?tab=${t.key}`)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'organizer' ? <OrganizerTab /> : <TasksTab scope="personal" />}
    </div>
  );
}

export default function MySpacePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MySpaceContent />
    </Suspense>
  );
}
