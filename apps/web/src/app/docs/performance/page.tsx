'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'individual', label: 'Individual stats' },
  { id: 'leaderboard', label: 'Reliability leaderboard' },
  { id: 'journal', label: 'Daily journal' },
];

export default function PerformanceDocsPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="performance" toc={TOC}>
        <h1>Performance</h1>
        <p>Numbers instead of guesses: how much got done, how reliably, and by whom.</p>

        <h2 id="individual">Individual stats</h2>
        <p>Anyone can see their own stats for a chosen date range. An Authority can see anyone&apos;s. The numbers cover:</p>
        <ul>
          <li><strong>Tasks assigned</strong> and <strong>tasks completed</strong> in the period.</li>
          <li><strong>Sent back for rework</strong>: how often a manager didn&apos;t approve on the first try.</li>
          <li><strong>Hours worked</strong>, from the timer sessions on In progress tasks.</li>
          <li><strong>On-time declaration rate</strong>: how often check-in happened when it was supposed to.</li>
          <li><strong>Deadlines met</strong>: the share of tasks with a due date that were validated before it.</li>
          <li><strong>Blockers encountered</strong> in the period.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/performance-stats.png" alt="The Performance page's stats for a date range" />
          <figcaption>Pick a date range, get every number for it at once.</figcaption>
        </figure>

        <h2 id="leaderboard">Reliability leaderboard</h2>
        <p>
          Each office can show a leaderboard ranking its members by reliability over a date range. Whether the
          whole team can see it, or only managers, is set in that office&apos;s{' '}
          <Link href="/docs/offices">settings</Link>.
        </p>
        <DocsCallout tone="warn">
          <p>
            This is meant to spot patterns, not to shame anyone. Turn it off for a team where it does more
            harm than good.
          </p>
        </DocsCallout>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/performance-leaderboard.png" alt="Daily activity and the reliability leaderboard" width={520} />
          <figcaption>Daily activity, and the leaderboard for a chosen office.</figcaption>
        </figure>

        <h2 id="journal">Daily journal</h2>
        <p>
          A day by day list of what got validated, so you (or your manager) can look back at any past date
          without digging through every task individually.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
