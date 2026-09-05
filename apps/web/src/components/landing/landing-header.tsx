'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { DoorControlIcon } from '@/components/icons/office-icons';
import { useAuth } from '@/lib/auth-context';

const NAV_EN = [
  { href: '/#how', label: 'How it works' },
  { href: '/#ritual', label: 'The daily ritual' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

const NAV_FR = [
  { href: '/fr/#how', label: 'Comment ça marche' },
  { href: '/fr/#ritual', label: 'Le rituel quotidien' },
  { href: '/fr/#features', label: 'Fonctionnalités' },
  { href: '/fr/pricing', label: 'Tarifs' },
  { href: '/fr/docs', label: 'Docs' },
];

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** La langue est déduite de l'URL (préfixe /fr), pas d'un prop à faire passer partout. */
export function LandingHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const authed = !loading && !!user;
  const isFr = pathname.startsWith('/fr');
  const nav = isFr ? NAV_FR : NAV_EN;
  const altHref = isFr ? pathname.slice(3) || '/' : `/fr${pathname === '/' ? '' : pathname}`;

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link href={isFr ? '/fr' : '/'} className="logo">
          <Image src="/logo.png" alt="OOffix" width={176} height={88} priority className="h-10 w-auto" />
        </Link>
        <nav className="nav-links">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href={altHref} className="lang-switch" aria-label={isFr ? 'Switch to English' : 'Passer en français'}>
            {isFr ? 'EN' : 'FR'}
          </Link>
          {authed ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm nav-dashboard-btn">
              <DoorControlIcon className="nav-dashboard-icon" width={16} height={16} />
              <span className="nav-dashboard-label">{isFr ? 'Tableau de bord' : 'Dashboard'}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm nav-auth-btn">
                {isFr ? 'Connexion' : 'Log in'}
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm nav-auth-btn">
                {isFr ? 'Essayer OOffix' : 'Try OOffix'}
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? (isFr ? 'Fermer le menu' : 'Close menu') : isFr ? 'Ouvrir le menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <BurgerIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="nav-mobile-panel">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
