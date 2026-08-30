'use client';

import { Loading } from '@/components/ui/loading';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CheckinReminder } from '@/components/layout/checkin-reminder';
import { Sidebar } from '@/components/layout/sidebar';
import { TaskTimeWatcher } from '@/components/layout/task-time-watcher';
import { Topbar } from '@/components/layout/topbar';
import { useAuth } from '@/lib/auth-context';

// Doit rester cohérent avec JWT_REFRESH_EXPIRES_IN côté API. Le token, lui, est
// renouvelé en silence par le moindre appel réseau (y compris le polling en
// arrière-plan) — sans ce minuteur basé sur l'activité réelle, un onglet resté
// ouvert ne se déconnecte jamais, peu importe depuis quand on n'y a pas touché.
const INACTIVITY_LIMIT_MS = 5 * 60 * 60 * 1000;
const ACTIVITY_CHECK_INTERVAL_MS = 60_000;
const LAST_ACTIVITY_KEY = 'ooffix_last_activity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Le calendrier a besoin de toute la largeur pour sa grille, et un fil de discussion
  // a besoin de la marge habituellement vide pour loger sa liste de conversations sans
  // rétrécir la fenêtre de chat elle-même — les autres pages restent plus contenues.
  const isFullWidthPage = pathname?.startsWith('/calendar') || /^\/chat\/.+/.test(pathname ?? '');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    let lastWrite = 0;
    function recordActivity() {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
    recordActivity();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now());
      if (Date.now() - last > INACTIVITY_LIMIT_MS) logout();
    }, ACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      clearInterval(interval);
    };
  }, [user, logout]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading className="text-sm" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CheckinReminder />
      <TaskTimeWatcher />
      <div className="flex min-h-0 flex-1">
        <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className={isFullWidthPage ? 'w-full' : 'mx-auto w-full max-w-5xl'}>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
