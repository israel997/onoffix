'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import { PLANS } from '@/lib/plans';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'free-org-limit', label: 'One Free organisation per account' },
  ...PLANS.map((p) => ({ id: p.key, label: p.name })),
  { id: 'seeing-your-plan', label: 'Seeing your plan' },
];

export default function PlansDocsPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="plans" toc={TOC}>
        <h1>Plans &amp; billing</h1>
        <p>
          OOffix has three plans. They mainly differ in how many offices you can run and how much your team
          can store; the daily check-in loop itself is the same on every plan. See the full{' '}
          <Link href="/pricing">pricing page</Link> for a side by side comparison.
        </p>

        <h2 id="free-org-limit">One Free organisation per account</h2>
        <DocsCallout>
          <p>
            An account can own at most one organisation on the Free plan at a time. Upgrade it, or create the
            next one from a different account.
          </p>
        </DocsCallout>

        {PLANS.map((plan) => (
          <div key={plan.key}>
            <h2 id={plan.key}>{plan.name}</h2>
            <p>{plan.tagline} {plan.price === 0 ? 'Free, forever.' : `$${plan.price}/month, with a 7-day free trial.`}</p>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ))}

        <h2 id="seeing-your-plan">Seeing your plan</h2>
        <p>
          From the Dashboard, the plan card shows your organisation&apos;s current plan; click it to see
          what&apos;s included and what upgrading unlocks.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/dashboard.png" alt="The Dashboard, with the plan card next to Offices and My Space" />
          <figcaption>The plan card sits right next to Offices and My Space on the Dashboard.</figcaption>
        </figure>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
