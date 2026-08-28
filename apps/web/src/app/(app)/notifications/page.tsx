'use client';

import { Loading } from '@/components/ui/loading';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MailIcon, MailOpenIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
  type AppNotification,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSubscriptionState,
} from '@/lib/push-notifications';
import { useToast } from '@/lib/toast-context';

function PushToggle() {
  const toast = useToast();
  const [state, setState] = useState<'unsupported' | 'subscribed' | 'not-subscribed' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushSubscriptionState().then(setState);
  }, []);

  if (state === null || state === 'unsupported') return null;

  async function toggle() {
    setBusy(true);
    try {
      if (state === 'subscribed') {
        await disablePushNotifications();
        setState('not-subscribed');
        toast('Push notifications disabled');
      } else {
        await enablePushNotifications();
        setState('subscribed');
        toast('Push notifications enabled');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-foreground">Push notifications</p>
        <CardDescription>
          {state === 'subscribed'
            ? 'Enabled on this device - you get notified even when OOffix is closed.'
            : 'Get notified on this device even when OOffix is closed.'}
        </CardDescription>
      </div>
      <Button size="sm" variant={state === 'subscribed' ? 'secondary' : 'primary'} disabled={busy} onClick={toggle}>
        {state === 'subscribed' ? 'Disable' : 'Enable'}
      </Button>
    </Card>
  );
}

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

  async function handleToggleRead(notification: AppNotification) {
    const lue = !notification.lue;
    setNotifications((prev) => prev?.map((n) => (n.id === notification.id ? { ...n, lue } : n)) ?? null);
    if (lue) await markNotificationAsRead(notification.id);
    else await markNotificationAsUnread(notification.id);
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

      <PushToggle />

      {notifications === null ? (
        <Loading className="text-sm" />
      ) : notifications.length === 0 ? (
        <Card>
          <CardDescription>No notifications yet.</CardDescription>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="flex flex-col divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n)}
                className={cn(
                  'flex items-center justify-between gap-3 border-l-4 py-2 pl-4 pr-4',
                  !n.lue ? 'border-brand-blue bg-brand-blue-light' : 'border-transparent',
                )}
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      'line-clamp-1 text-sm text-foreground',
                      !n.lue && 'font-semibold',
                    )}
                  >
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {n.lien && (
                    <Link
                      href={n.lien}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n);
                      }}
                      className="whitespace-nowrap text-xs font-medium text-brand-blue hover:underline"
                    >
                      View →
                    </Link>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRead(n);
                    }}
                    aria-label={n.lue ? 'Mark as unread' : 'Mark as read'}
                    title={n.lue ? 'Mark as unread' : 'Mark as read'}
                    className={cn(n.lue ? 'text-muted-foreground hover:text-foreground' : 'text-brand-blue')}
                  >
                    {n.lue ? <MailOpenIcon className="h-4 w-4" /> : <MailIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
