'use client';

import { Loading } from '@/components/ui/loading';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuth } from '@/lib/auth-context';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Le calendrier a besoin de toute la largeur pour sa grille — les autres pages
  // gagnent à être plus contenues plutôt qu'étirées bord à bord.
  const isFullWidthPage = pathname?.startsWith('/calendar');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading className="text-sm" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className={isFullWidthPage ? 'w-full' : 'mx-auto w-full max-w-5xl'}>{children}</div>
        </main>
      </div>
    </div>
  );
}
