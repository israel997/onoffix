'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'what', label: 'What it shows' },
  { id: 'views', label: 'My tasks vs the whole organisation' },
  { id: 'editing', label: 'Editing from the calendar' },
];

export default function CalendarDocsPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="calendar" toc={TOC}>
        <h1>Calendar</h1>
        <p>A month view of every task that has a due date, so nothing sneaks up on you at the last minute.</p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/calendar.png" alt="The Calendar page, month view" />
          <figcaption>A month at a glance, with the selected day&apos;s tasks on the right.</figcaption>
        </figure>

        <h2 id="what">What it shows</h2>
        <p>
          Only tasks with a due date appear here: not every task needs one, so this is meant as a deadline
          view, not a full task list (that&apos;s what an office&apos;s Tasks tab is for).
        </p>

        <h2 id="views">My tasks vs the whole organisation</h2>
        <p>
          By default you see your own tasks, from every office you belong to plus your personal BrainDumper.
          An Authority can switch to a view of the whole organisation&apos;s deadlines instead, useful for
          spotting a week where too much is due at once.
        </p>

        <h2 id="editing">Editing from the calendar</h2>
        <p>Click a task to open it: change its due date, its priority, or delete it, without leaving the calendar.</p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
