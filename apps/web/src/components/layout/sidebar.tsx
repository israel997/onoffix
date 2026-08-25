'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import {
  AlarmIcon,
  ChairIcon,
  ChartIcon,
  DeskIcon,
  DeskLampIcon,
  DoorControlIcon,
  GroupIcon,
  IdBadgeIcon,
  MailIcon,
  MasterKeyIcon,
  PhoneIcon,
  WallCalendarIcon,
} from '@/components/icons/office-icons';
import { getUnreadNotificationsCount } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  href: string;
  available: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  hideIfNoOffices?: boolean;
  /** Rouge tant qu'il reste du non-lu ; redevient normal une fois tout lu. */
  redIfUnread?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', available: true, icon: DoorControlIcon },
  { label: 'Offices', href: '/offices', available: true, hideIfNoOffices: true, icon: ChairIcon },
  { label: 'Calendar', href: '/calendar', available: true, icon: WallCalendarIcon },
  { label: 'Notifications', href: '/notifications', available: true, redIfUnread: true, icon: MailIcon },
  { label: 'Chat', href: '/chat', available: true, icon: PhoneIcon },
  { label: 'Members', href: '/members', available: true, icon: GroupIcon },
  { label: 'My Space', href: '/my-space', available: true, icon: DeskIcon },
  { label: 'Daily check-in', href: '/check-in', available: false, icon: AlarmIcon },
  { label: 'Reporting', href: '/reporting', available: false, icon: ChartIcon },
  { label: 'Performance', href: '/performance', available: false, icon: ChartIcon },
  { label: 'Organisation settings', href: '/settings', available: true, adminOnly: true, icon: MasterKeyIcon },
  { label: 'Profile', href: '/profile', available: true, icon: IdBadgeIcon },
  { label: 'Platform admin', href: '/admin', available: true, superAdminOnly: true, icon: DeskLampIcon },
];

const SUPER_ADMIN_EMAIL = 'israellawani.pro@gmail.com';
const UNREAD_POLL_MS = 20_000;

function SidebarNav({
  pathname,
  isAdmin,
  isSuperAdmin,
  hasOffices,
  hasUnreadNotifications,
  compact,
}: {
  pathname: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasOffices: boolean;
  hasUnreadNotifications: boolean;
  /** Rail d'icônes seules (desktop) — le nom n'apparaît qu'au survol. */
  compact: boolean;
}) {
  return (
    <nav className={cn('flex flex-1 flex-col gap-1', compact && 'items-center')}>
      {NAV_ITEMS.filter(
        (item) =>
          (!item.adminOnly || isAdmin) &&
          (!item.superAdminOnly || isSuperAdmin) &&
          (!item.hideIfNoOffices || isAdmin || hasOffices),
      ).map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
        const red = item.redIfUnread && hasUnreadNotifications;
        const Icon = item.icon;

        if (!item.available) {
          return (
            <div
              key={item.href}
              className={cn(
                'group relative flex items-center text-muted-foreground/40',
                compact
                  ? 'h-11 w-11 justify-center rounded-lg'
                  : 'justify-between rounded-lg px-3 py-2 text-sm',
              )}
            >
              {compact ? (
                <Icon className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <>
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </span>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Soon
                  </span>
                </>
              )}
              {compact && (
                <span className="pointer-events-none absolute left-full ml-2 z-20 hidden whitespace-nowrap rounded-md bg-brand-navy px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                  {item.label} · Soon
                </span>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center transition-colors',
              compact ? 'h-11 w-11 justify-center rounded-lg' : 'justify-between rounded-lg px-3 py-2 text-sm font-medium',
              active
                ? 'bg-brand-blue-light text-brand-blue-dark'
                : red
                  ? 'text-status-review hover:bg-surface-muted'
                  : 'text-foreground hover:bg-surface-muted',
            )}
          >
            {compact ? (
              <Icon className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <span className="flex items-center gap-2.5">
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </span>
            )}
            {red && (
              <span
                className={cn(
                  'shrink-0 rounded-full bg-status-review',
                  compact ? 'absolute right-1.5 top-1.5 h-2 w-2' : 'h-2 w-2',
                )}
              />
            )}
            {compact && (
              <span className="pointer-events-none absolute left-full ml-2 z-20 hidden whitespace-nowrap rounded-md bg-brand-navy px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const hasOffices = !!user && user.bureaux.length > 0;
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function poll() {
      try {
        const { count } = await getUnreadNotificationsCount();
        if (active) setHasUnreadNotifications(count > 0);
      } catch {
        // silencieux — l'indicateur n'est pas critique
      }
    }
    poll();
    const interval = setInterval(poll, UNREAD_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <>
      <aside className="hidden w-48 shrink-0 flex-col items-center border-r border-border bg-surface py-6 md:flex">
        <Link href="/" className="mb-8">
          <Image src="/logo.png" alt="OOffix" width={176} height={88} priority className="h-11 w-auto" />
        </Link>
        <SidebarNav
          pathname={pathname}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          hasOffices={hasOffices}
          hasUnreadNotifications={hasUnreadNotifications}
          compact
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="relative flex h-full w-64 flex-col bg-surface px-4 py-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between px-2">
              <Link href="/" className="flex items-center">
                <Image src="/logo.png" alt="OOffix" width={176} height={88} priority className="h-14 w-auto" />
              </Link>
              <button
                onClick={onMobileClose}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-muted"
              >
                ✕
              </button>
            </div>
            <SidebarNav
              pathname={pathname}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              hasOffices={hasOffices}
              hasUnreadNotifications={hasUnreadNotifications}
              compact={false}
            />
          </aside>
        </div>
      )}
    </>
  );
}
