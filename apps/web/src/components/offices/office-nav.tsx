'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

export function OfficeNav({ bureauId, showSettings }: { bureauId: string; showSettings: boolean }) {
  const pathname = usePathname();

  const items = [
    { label: 'Overview', href: `/offices/${bureauId}` },
    { label: 'Organizer', href: `/offices/${bureauId}/organizer` },
    { label: 'Tasks', href: `/offices/${bureauId}/tasks` },
    ...(showSettings ? [{ label: 'Today', href: `/offices/${bureauId}/today` }] : []),
    ...(showSettings ? [{ label: 'Settings', href: `/offices/${bureauId}/settings` }] : []),
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
