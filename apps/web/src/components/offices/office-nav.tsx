'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KeyIcon } from '@/components/icons/office-icons';
import { cn } from '@/lib/cn';

export function OfficeNav({ bureauId, showSettings }: { bureauId: string; showSettings: boolean }) {
  const pathname = usePathname();

  const overviewHref = `/offices/${bureauId}`;
  const items = [
    { label: 'Overview', href: overviewHref },
    { label: 'Organizer', href: `/offices/${bureauId}/organizer` },
    { label: 'Tasks', href: `/offices/${bureauId}/tasks` },
    { label: 'Projects', href: `/offices/${bureauId}/projects` },
    ...(showSettings ? [{ label: 'Today', href: `/offices/${bureauId}/today` }] : []),
    ...(showSettings ? [{ label: 'Settings', href: `/offices/${bureauId}/settings`, icon: KeyIcon }] : []),
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const active =
          item.href === overviewHref ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon && <item.icon className="h-3.5 w-3.5" />}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
