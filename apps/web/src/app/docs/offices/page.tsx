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
  { id: 'what', label: 'What an office is' },
  { id: 'members', label: 'Members' },
  { id: 'adding', label: 'Adding someone to an office' },
  { id: 'settings', label: 'Office settings' },
  { id: 'alerts', label: 'Alerts' },
];

export default function OfficesPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="offices" toc={TOC}>
        <h1>Offices</h1>
        <p>
          An office is where the actual work happens: it groups a team, their tasks, their chat, and their own
          check-in rhythm. Most of your day in OOffix happens inside one office or another.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/offices-list.png" alt="The Offices list, one card per team" />
          <figcaption>Every office your account can see, one card each.</figcaption>
        </figure>

        <h2 id="what">What an office is</h2>
        <p>
          Think of an office as a team or a department: Engineering, Sales, a specific client account. Each
          office has its own:
        </p>
        <ul>
          <li>Member list, with each member&apos;s internal role (a free text label like &quot;Developer&quot;).</li>
          <li>Tasks, organized by subject in its BrainDumper (see <Link href="/docs/organizer">BrainDumper</Link>).</li>
          <li>Chat, separate from any other office&apos;s chat.</li>
          <li>Check-in time and reminder settings.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/office-team-stats.png" alt="An office's overview tab with team stats" />
          <figcaption>An office&apos;s overview: tasks, progress, in progress, done, blocked, deadlines met.</figcaption>
        </figure>

        <h2 id="members">Members</h2>
        <p>
          Only people already in your organisation can be added to an office; if someone is completely new,
          add them at the organisation level first (Members page). Adding someone to an office sends them an
          invitation they need to accept before they show up in that office&apos;s member list, tasks, and
          chat.
        </p>

        <h2 id="adding">Adding someone to an office</h2>
        <ol>
          <li>Open the office, and use the add member button on its overview page.</li>
          <li>Pick them from the list of organisation members not already in this office.</li>
          <li>Optionally give them an internal role label, shown next to their name in this office.</li>
          <li>They receive a notification and an invitation; nothing changes for them until they accept it.</li>
        </ol>
        <DocsCallout>
          <p>
            Manager or Collaborator isn&apos;t chosen here anymore: it&apos;s set once for the whole
            organisation. See <Link href="/docs/roles">Roles &amp; permissions</Link>.
          </p>
        </DocsCallout>

        <h2 id="settings">Office settings</h2>
        <p>Available to an Authority, or a Manager who belongs to the office, from its Settings tab:</p>
        <ul>
          <li><strong>Daily check-in time and timezone</strong>: when the day is considered &quot;closed&quot; for this office.</li>
          <li><strong>Reminder delay</strong>: how long after check-in time to nudge anyone who hasn&apos;t declared yet.</li>
          <li><strong>Reliability leaderboard</strong>: whether the team can see it, or only managers.</li>
          <li><strong>Color and photo</strong>: how the office is shown on the Offices list.</li>
          <li><strong>Deleting the office</strong>: permanently removes its tasks, projects, and chat history. Reserved for an Authority.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/office-settings.png" alt="An office's settings form" width={520} />
          <figcaption>Name, check-in time, timezone, reminder delay, leaderboard visibility, color.</figcaption>
        </figure>

        <h2 id="alerts">Alerts</h2>
        <p>
          An Authority can flag an office as on alert (orange) or on fire (red), for a chosen number of days
          and hours. While active, the office&apos;s card is colored on the Offices list, and a banner shows
          up for anyone entering it. Use this to surface a team that needs attention without writing a message
          to everyone.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/office-alerts.png" alt="Alert status and danger zone in office settings" width={520} />
          <figcaption>Setting an alert, and the office deletion danger zone right below it.</figcaption>
        </figure>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
