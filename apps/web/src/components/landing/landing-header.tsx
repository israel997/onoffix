'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function LandingHeader() {
  const { user, loading } = useAuth();
  const authed = !loading && !!user;

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link href="/" className="logo">
          <Image src="/logo.png" alt="OOffix" width={176} height={88} priority className="h-10 w-auto" />
        </Link>
        <nav className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/#ritual">The daily ritual</Link>
          <Link href="/#features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="nav-actions">
          {authed ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Log in
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                Try OOffix
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
