'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NotificationsBell } from '@/components/layout/notifications-bell';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  if (!user) return null;

  const bureauLabel = user.bureaux[0]
    ? `${user.bureaux[0].bureau.nom} · ${user.bureaux[0].roleDansBureau === 'MANAGER' ? 'Manager' : 'Collaborator'}`
    : user.roleGlobal === 'ADMIN'
      ? 'Organisation admin'
      : 'No office yet';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <OrgSwitcher organisationNom={user.organisation.nom} logoUrl={user.organisation.logoUrl} />
          <p className="text-xs text-muted-foreground">{bureauLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationsBell />
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-surface-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
              {initials(user.nom)}
            </span>
            <span className="text-sm font-medium text-foreground">{user.nom}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg">
              <div className="border-b border-border px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">{user.nom}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
