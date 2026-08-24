'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification,
} from '@/lib/api';
import { cn } from '@/lib/cn';
import { useToast } from '@/lib/toast-context';

const POLL_INTERVAL_MS = 20_000;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsBell() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications();
      setNotifications(data);

      if (seenIdsRef.current === null) {
        // Premier chargement : on mémorise l'existant sans notifier, pour ne pas
        // spammer un toast par notification déjà là au montage.
        seenIdsRef.current = new Set(data.map((n) => n.id));
      } else {
        const nouvelles = data.filter((n) => !n.lue && !seenIdsRef.current!.has(n.id));
        for (const n of nouvelles) {
          toast(n.message);
        }
        seenIdsRef.current = new Set(data.map((n) => n.id));
      }
    } catch {
      // silencieux — la cloche n'est pas critique
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    setOpen((v) => !v);
  }

  async function handleMarkAllAsRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev?.map((n) => ({ ...n, lue: true })) ?? null);
  }

  async function handleMarkAsRead(notification: AppNotification) {
    if (notification.lue) return;
    setNotifications(
      (prev) => prev?.map((n) => (n.id === notification.id ? { ...n, lue: true } : n)) ?? null,
    );
    await markNotificationAsRead(notification.id);
  }

  const unreadCount = notifications?.filter((n) => !n.lue).length ?? 0;
  const preview = notifications?.slice(0, 5) ?? null;

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
            {preview === null ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Loading…</p>
            ) : preview.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              preview.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n)}
                  className={cn(
                    'flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-muted',
                    !n.lue && 'bg-brand-blue-light/40',
                  )}
                >
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap break-words text-foreground">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatWhen(n.createdAt)}</p>
                  </div>
                  {n.lien && (
                    <Link
                      href={n.lien}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n);
                        setOpen(false);
                      }}
                      className="shrink-0 whitespace-nowrap text-xs font-medium text-brand-blue hover:underline"
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-blue hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
