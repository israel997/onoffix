'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import { StructureDiagram } from '@/components/docs/structure-diagram';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'what-is-ooffix', label: 'What is OOffix' },
  { id: 'organisation', label: 'Your organisation' },
  { id: 'first-office', label: 'Your first office' },
  { id: 'inviting', label: 'Inviting your team' },
  { id: 'next', label: 'Where to go next' },
];

export default function GettingStartedPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="getting-started" toc={TOC}>
        <h1>Getting started</h1>
        <p>
          OOffix helps a team run its day to day work without a meeting for every update. This page walks
          through the first things to set up: your organisation, your first office, and your team.
        </p>

        <h2 id="what-is-ooffix">What is OOffix</h2>
        <p>
          OOffix is built around a simple idea: a team declares what it did each day, and a manager confirms
          it, without a status meeting. Everything else (tasks, chat, calendar, performance stats) exists to
          support that loop.
        </p>
        <p>Three concepts come up everywhere in the product:</p>
        <ul>
          <li>
            <strong>Organisation</strong>: your company or workspace. Everyone you invite belongs to one
            organisation.
          </li>
          <li>
            <strong>Office</strong>: a team or department inside your organisation (Engineering, Sales, a client
            account, anything that groups people and tasks together).
          </li>
          <li>
            <strong>Task</strong>: the unit of work. It moves through a small set of statuses from creation to
            completion. See the <Link href="/docs/tasks">Tasks</Link> page for the full lifecycle.
          </li>
        </ul>
        <StructureDiagram />
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/sidebar-nav.png" alt="OOffix sidebar navigation" width={280} />
          <figcaption>Every section of the app, one click away in the sidebar.</figcaption>
        </figure>

        <h2 id="organisation">Your organisation</h2>
        <p>
          When you sign up, OOffix creates an organisation for you and makes you its owner. The owner is the
          one person who can transfer ownership or delete the organisation entirely. Day to day management
          (members, offices, roles) doesn&apos;t require being the owner: see{' '}
          <Link href="/docs/roles">Roles &amp; permissions</Link> for the full breakdown.
        </p>
        <DocsCallout>
          <p>
            An account can only own one organisation on the Free plan. If you need a second one, upgrade the
            first, or create the new one from a different account.
          </p>
        </DocsCallout>

        <h2 id="first-office">Your first office</h2>
        <p>Create an office from the Offices page. An office needs just a name to start. Once created, you can:</p>
        <ol>
          <li>Set its daily check-in time and timezone, in the office&apos;s Settings tab.</li>
          <li>Add members who already belong to your organisation.</li>
          <li>Give it a color and a photo, so it&apos;s easy to recognize on the Offices list.</li>
        </ol>
        <p>An organisation can hold up to 10 offices, depending on your plan (see <Link href="/docs/plans">Plans &amp; billing</Link>).</p>

        <h2 id="inviting">Inviting your team</h2>
        <p>
          Add people at the organisation level first, from the Members page: enter their name and email. If
          they already have an OOffix account, they&apos;re added right away. Otherwise they get an email
          invitation to set their own password.
        </p>
        <p>
          Being a member of the organisation doesn&apos;t put someone in any office yet. Add them to a
          specific office from that office&apos;s page; they&apos;ll get an invitation to accept before they
          actually join it and start seeing its tasks and chat.
        </p>

        <h2 id="next">Where to go next</h2>
        <ul>
          <li><Link href="/docs/roles">Roles &amp; permissions</Link>: who can do what.</li>
          <li><Link href="/docs/offices">Offices</Link>: settings, members, alerts.</li>
          <li><Link href="/docs/tasks">Tasks</Link>: the full lifecycle and what each button does.</li>
          <li><Link href="/docs/check-in">Check-In &amp; Validations</Link>: how a day gets declared and approved.</li>
        </ul>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
