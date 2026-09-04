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
  { id: 'why', label: 'Why a daily check-in' },
  { id: 'office-checkin', label: "An office's Check-In tab" },
  { id: 'validations', label: 'The Validations page' },
  { id: 'reminders', label: 'Reminders' },
];

export default function CheckInPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="check-in" toc={TOC}>
        <h1>Check-In &amp; Validations</h1>
        <p>
          This is the daily loop OOffix is built around: someone marks a task done, a manager confirms it. No
          status meeting needed.
        </p>

        <h2 id="why">Why a daily check-in</h2>
        <p>
          A task marked Done doesn&apos;t disappear immediately: it moves to Declared, and sits in its
          office&apos;s Check-In tab until a manager approves or sends it back. That short pause is what
          replaces a daily status meeting: the manager reviews what came in, once, instead of asking around.
        </p>

        <h2 id="office-checkin">An office&apos;s Check-In tab</h2>
        <p>
          Open from within an office. A manager sees every task waiting for approval there, under &quot;Waiting
          for your approval&quot;, each with the comment the assignee left (if any) and two actions:
        </p>
        <ul>
          <li><strong>Approve</strong>: the task moves to Validated. Final.</li>
          <li><strong>Send back</strong>: the task moves to Needs rework. The assignee sees it again and can resume it.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/checkin-approve.png" alt="An office's Check-In tab, waiting for approval" />
          <figcaption>Waiting for your approval: each task with its comment, Approve or Send back.</figcaption>
        </figure>
        <p>
          Approved tasks stay visible below, in a collapsible history you can filter by date, so nothing feels
          like it vanishes once it&apos;s validated.
        </p>
        <DocsCallout>
          <p>A Collaborator without manager rights in that office sees this tab as read-only: how today&apos;s work is going, without the approval actions.</p>
        </DocsCallout>

        <h2 id="validations">The Validations page</h2>
        <p>
          Reachable from the sidebar for anyone, this page gives a wider view across every office you&apos;re
          involved in:
        </p>
        <ul>
          <li><strong>Your day</strong>: a personal checklist of today&apos;s tasks, to declare what you got done.</li>
          <li><strong>Your teams&apos; Check-In</strong>: a shortcut into each office you manage, straight to its Check-In tab.</li>
          <li><strong>Team validations today</strong>: a read-only feed of who validated what, across every office you belong to (every office, for an Authority).</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/validations-today.png" alt="The Validations page, declaring today's tasks" />
          <figcaption>Your day: check off what you completed, then declare.</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/validations-teams-checkin.png" alt="Your teams' Check-In, one row per office" width={520} />
          <figcaption>Your teams&apos; Check-In: a shortcut into each office you manage.</figcaption>
        </figure>

        <h2 id="reminders">Reminders</h2>
        <p>
          Each office has its own check-in time and a reminder delay, set in its Settings tab (see{' '}
          <Link href="/docs/offices">Offices</Link>). If someone hasn&apos;t declared anything by then, OOffix
          nudges them, and lets their manager know.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
