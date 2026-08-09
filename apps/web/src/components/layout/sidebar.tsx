'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  href: string;
  available: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', available: true },
  { label: 'Offices', href: '/offices', available: true },
  { label: 'Members', href: '/members', available: true },
  { label: 'Projects & tasks', href: '/projects', available: false },
  { label: 'Daily check-in', href: '/check-in', available: false },
  { label: 'Reporting', href: '/reporting', available: false },
  { label: 'Performance', href: '/performance', available: false },
  { label: 'Profile', href: '/profile', available: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center px-2">
        <Image src="/logo.png" alt="OnOffix" width={176} height={88} priority className="h-14 w-auto" />
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          if (!item.available) {
            return (
              <span
                key={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
              >
                {item.label}
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Soon
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-blue-light text-brand-blue-dark'
                  : 'text-foreground hover:bg-surface-muted',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
