'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from '@/lib/api';
import { cn } from '@/lib/cn';

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  async function load() {
    setNotifications(await listNotifications());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev?.map((n) => ({ ...n, lue: true })) ?? null);
  }

  async function handleMarkAsRead(notification: AppNotification) {
    if (notification.lue) return;
    setNotifications((prev) => prev?.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)) ?? null);
    await markNotificationAsRead(notification.id);
  }

  const unreadCount = notifications?.filter((n) => !n.lue).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything that happened, all in one place.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {notifications === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notifications.length === 0 ? (
        <Card>
          <CardDescription>No notifications yet.</CardDescription>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n)}
                className={cn(
                  'flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0',
                  !n.lue && 'bg-brand-blue-light/30',
                )}
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                </div>
                {n.lien && (
                  <Link
                    href={n.lien}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n);
                    }}
                    className="shrink-0 whitespace-nowrap text-xs font-medium text-brand-blue hover:underline"
                  >
                    View →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
