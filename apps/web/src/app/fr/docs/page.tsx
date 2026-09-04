'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DOCS_NAV_FR } from '@/lib/docs-nav-fr';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-src',
});
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-src',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-src',
});

export default function DocsIndexPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />

      <section className="docs-hero">
        <div className="wrap">
          <span className="eyebrow">Documentation</span>
          <h1>Comment fonctionne OOffix.</h1>
          <p>
            Un guide pour les managers et les collaborateurs : comment les bureaux, les tâches et les rôles
            s&apos;articulent, étape par étape. Choisissez un sujet ci-dessous.
          </p>

          <div className="docs-index-grid">
            {DOCS_NAV_FR.map((item, i) => (
              <Link key={item.slug} href={`/fr/docs/${item.slug}`} className="docs-index-card">
                <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
