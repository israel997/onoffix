'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from '@/lib/api';
import { cn } from '@/lib/cn';

const POLL_INTERVAL_MS = 30_000;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await getUnreadNotificationsCount();
      setUnreadCount(count);
    } catch {
      // silencieux — le badge n'est pas critique
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setNotifications(await listNotifications());
    }
  }

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev?.map((n) => ({ ...n, lue: true })) ?? null);
    setUnreadCount(0);
  }

  async function handleNotificationClick(notification: AppNotification) {
    if (!notification.lue) {
      await markNotificationAsRead(notification.id);
      setNotifications(
        (prev) => prev?.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)) ?? null,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-muted"
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-foreground">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.5c0 .7-.28 1.37-.78 1.87L4 15.6c-.9.9-.26 2.4 1 2.4h14c1.26 0 1.9-1.5 1-2.4l-1.22-1.23A2.65 2.65 0 0 1 18 12.5V9a6 6 0 0 0-6-6Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M9.5 20a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-review px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-brand-blue hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications === null ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    className={cn(
                      'flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm',
                      !n.lue && 'bg-brand-blue-light/40',
                    )}
                  >
                    <p className="text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                  </div>
                );
                return n.lien ? (
                  <Link
                    key={n.id}
                    href={n.lien}
                    onClick={() => handleNotificationClick(n)}
                    className="block hover:bg-surface-muted"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="block w-full text-left hover:bg-surface-muted"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
