'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'four-levels', label: 'The four levels' },
  { id: 'owner', label: 'Owner' },
  { id: 'authority', label: 'Authority' },
  { id: 'manager', label: 'Manager' },
  { id: 'collaborator', label: 'Collaborator' },
  { id: 'changing', label: "Changing someone's role" },
  { id: 'transfer', label: 'Transferring ownership' },
];

export default function RolesPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="roles" toc={TOC}>
        <h1>Roles &amp; permissions</h1>
        <p>
          A person has one role for the whole organisation, set once on the Members page. It applies
          everywhere they go, so you never have to pick a role again each time someone joins a new office.
        </p>

        <h2 id="four-levels">The four levels</h2>
        <p>From most to least access:</p>
        <ol>
          <li><strong>Owner</strong>: unique, transferable.</li>
          <li><strong>Authority</strong>: full access to the whole organisation.</li>
          <li><strong>Manager</strong>: approval rights, limited to the offices they belong to.</li>
          <li><strong>Collaborator</strong>: works on their own tasks.</li>
        </ol>

        <h2 id="owner">Owner</h2>
        <p>
          Every organisation has exactly one owner: whoever created it, unless ownership has been transferred
          since. Two actions are reserved for the owner alone:
        </p>
        <ul>
          <li>Transferring ownership to someone else.</li>
          <li>Deleting the organisation.</li>
        </ul>
        <p>
          Outside of those two actions, the owner doesn&apos;t need any special treatment: they typically also
          hold Authority, which covers everything else.
        </p>

        <h2 id="authority">Authority</h2>
        <p>
          An Authority has access to every office in the organisation, even ones they never explicitly joined.
          They can:
        </p>
        <ul>
          <li>See and manage every office, its members, and its settings.</li>
          <li>Invite, remove, and change the role of any member (except the owner&apos;s role).</li>
          <li>Flag an office as on alert (orange or red) for a set duration.</li>
          <li>Change organisation settings: name, logo.</li>
          <li>See the organisation-wide task calendar and every member&apos;s stats.</li>
        </ul>
        <DocsCallout>
          <p>
            Authority is an organisation role. It&apos;s different from OOffix&apos;s own platform admin,
            which only applies to the person operating OOffix itself and has nothing to do with your
            organisation.
          </p>
        </DocsCallout>

        <h2 id="manager">Manager</h2>
        <p>
          A Manager gets approval rights, but only in the offices they&apos;re already a member of. In those
          offices, they can:
        </p>
        <ul>
          <li>Approve or send back a task someone marked done.</li>
          <li>Add and remove members.</li>
          <li>Move a task to a different subject, or reassign it.</li>
          <li>Resolve a reported blocker.</li>
          <li>Change that office&apos;s settings (check-in time, timezone, reliability leaderboard visibility).</li>
        </ul>
        <p>
          A Manager doesn&apos;t automatically see offices they haven&apos;t joined. Being Manager is about
          the level of trust once you&apos;re in the room, not a backstage pass to every room.
        </p>

        <h2 id="collaborator">Collaborator</h2>
        <p>The default level. A Collaborator can, on tasks assigned to them:</p>
        <ul>
          <li>Accept, start, pause, resume, and mark a task as done.</li>
          <li>Report a blocker on a task they&apos;re working on.</li>
          <li>Take an unassigned task in an office they belong to.</li>
          <li>Use chat, the calendar, and their own performance stats.</li>
        </ul>

        <h2 id="changing">Changing someone&apos;s role</h2>
        <p>
          Go to the Members page. An Authority can change anyone&apos;s role there with a single dropdown:
          Authority, Manager, or Collaborator. The owner&apos;s row is fixed and can&apos;t be changed from
          this dropdown; see below to transfer ownership instead.
        </p>

        <h2 id="transfer">Transferring ownership</h2>
        <p>
          Only the current owner can do this. On the Members page, next to the person you want to hand
          ownership to, use &quot;Make owner&quot;. They become the sole owner immediately; you keep whatever
          role you had otherwise (typically Authority, so you don&apos;t lose access to anything else).
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
