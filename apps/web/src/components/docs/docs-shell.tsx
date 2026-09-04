'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { DOCS_NAV } from '@/lib/docs-nav';
import { DOCS_NAV_FR } from '@/lib/docs-nav-fr';

export interface TocEntry {
  id: string;
  label: string;
}

export function DocsShell({
  activeSlug,
  toc,
  locale = 'en',
  children,
}: {
  activeSlug: string;
  toc: TocEntry[];
  locale?: 'en' | 'fr';
  children: ReactNode;
}) {
  const isFr = locale === 'fr';
  const nav = isFr ? DOCS_NAV_FR : DOCS_NAV;
  const base = isFr ? '/fr/docs' : '/docs';
  const active = nav.find((item) => item.slug === activeSlug);

  return (
    <div className="wrap docs-body">
      <aside className="docs-sidebar">
        <p className="docs-sidebar-title">{isFr ? 'Documentation' : 'Documentation'}</p>
        {nav.map((item) => (
          <Link key={item.slug} href={`${base}/${item.slug}`} className={item.slug === activeSlug ? 'active' : ''}>
            {item.title}
          </Link>
        ))}
      </aside>

      <main className="docs-content">
        <p className="docs-crumbs">
          <Link href={base}>Docs</Link> {'>'} {active?.title ?? ''}
        </p>
        {children}
      </main>

      {toc.length > 0 && (
        <aside className="docs-toc">
          <p className="docs-toc-title">{isFr ? 'Sur cette page' : 'On this page'}</p>
          <ul>
            {toc.map((entry) => (
              <li key={entry.id}>
                <a href={`#${entry.id}`}>{entry.label}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

/** Boîte d'info encadrée, façon "Good to know" - `tone="warn"` pour un avertissement. */
export function DocsCallout({
  title,
  tone = 'info',
  locale = 'en',
  children,
}: {
  title?: string;
  tone?: 'info' | 'warn';
  locale?: 'en' | 'fr';
  children: ReactNode;
}) {
  const resolvedTitle = title ?? (locale === 'fr' ? 'Bon à savoir' : 'Good to know');
  return (
    <div className={`docs-callout ${tone === 'warn' ? 'warn' : ''}`}>
      <p className="docs-callout-title">{resolvedTitle}</p>
      {children}
    </div>
  );
}

/** Une ligne icône + nom + description - légende des icônes d'action sur les tâches. */
export function DocsIconRow({
  icon,
  color,
  bg,
  label,
  desc,
}: {
  icon: ReactNode;
  color: string;
  bg: string;
  label: string;
  desc: string;
}) {
  return (
    <div className="docs-icon-row">
      <span className="swatch" style={{ color, background: bg }}>
        {icon}
      </span>
      <div>
        <p className="label">{label}</p>
        <p className="desc">{desc}</p>
      </div>
    </div>
  );
}
