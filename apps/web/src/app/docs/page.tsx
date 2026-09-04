'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DOCS_NAV } from '@/lib/docs-nav';
import '../landing.css';

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

export default function DocsIndexPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />

      <section className="docs-hero">
        <div className="wrap">
          <span className="eyebrow">Documentation</span>
          <h1>How OOffix works.</h1>
          <p>
            A guide for managers and collaborators: how offices, tasks and roles fit together, step by step. Pick
            a topic below.
          </p>

          <div className="docs-index-grid">
            {DOCS_NAV.map((item, i) => (
              <Link key={item.slug} href={`/docs/${item.slug}`} className="docs-index-card">
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
