'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import {
  AlertTriangleIcon,
  DoubleCheckIcon,
  FlagIcon,
  HandStopIcon,
  RocketIcon,
} from '@/components/icons/office-icons';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsIconRow, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'lifecycle', label: 'The task lifecycle' },
  { id: 'personal', label: 'Personal tasks vs office tasks' },
  { id: 'icons', label: 'Action icons' },
  { id: 'priorities', label: 'Priorities' },
  { id: 'blockers', label: 'Blockers' },
  { id: 'moving', label: 'Moving and reassigning' },
];

export default function TasksPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="tasks" toc={TOC}>
        <h1>Tasks</h1>
        <p>
          A task is the unit of work in OOffix. It moves through a small, fixed set of statuses, and each
          status decides which action is available next, shown as a single colored icon button on the task
          card.
        </p>

        <h2 id="lifecycle">The task lifecycle</h2>
        <ol>
          <li><strong>To do</strong>: created, assigned or not, nobody has started it yet.</li>
          <li><strong>Accepted</strong>: the assignee has taken it on, but hasn&apos;t started the timer.</li>
          <li><strong>In progress</strong>: the timer is running, or paused (still &quot;In progress&quot;, just without an active session).</li>
          <li><strong>Declared</strong>: the assignee marked it done. It now waits for a manager&apos;s approval.</li>
          <li><strong>Validated</strong>: a manager approved it. This is the final state.</li>
          <li><strong>Needs rework</strong>: a manager sent it back instead of approving it. It goes back to In progress once resumed.</li>
        </ol>
        <p>
          Only a manager (or Authority) can move a Declared task to Validated or Needs rework, from the
          office&apos;s Check-In tab. See <Link href="/docs/check-in">Check-In &amp; Validations</Link>.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/tasks-grouped.png" alt="Tasks grouped by subject, collapsed" />
          <figcaption>An office&apos;s Tasks tab, grouped by subject.</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/tasks-expanded.png" alt="A subject expanded, showing individual task cards" />
          <figcaption>Expanded: each card shows who it&apos;s assigned to and its current status.</figcaption>
        </figure>

        <h2 id="personal">Personal tasks vs office tasks</h2>
        <p>
          A task can live in an office (visible to the whole team, subject to manager approval) or in your own
          BrainDumper, under My Space. A personal task has no manager step: checking it off validates it
          immediately, since only you can see it.
        </p>

        <h2 id="icons">Action icons</h2>
        <p>
          Each task card shows only the actions that make sense for its current status and for who&apos;s
          looking at it. No background fill, just a colored icon:
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/task-icon-accept.png" alt="A To do task showing the Accept icon" width={420} />
          <figcaption>A To do task assigned to you: just Accept.</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/task-icons-inprogress.png" alt="An In progress task showing Break, Done and Report a problem" />
          <figcaption>In progress: Break, Done, and Report a problem, with Move to right after.</figcaption>
        </figure>
        <div className="docs-icon-legend">
          <DocsIconRow
            icon={<DoubleCheckIcon />}
            color="#0b63f6"
            bg="#eaf1ff"
            label="Accept"
            desc="Take on a To do task assigned to you. Moves it to Accepted."
          />
          <DocsIconRow
            icon={<RocketIcon />}
            color="#16a34a"
            bg="#e8f7ef"
            label="Start / Resubmit"
            desc="Begin working: starts the timer and moves the task to In progress."
          />
          <DocsIconRow
            icon={<HandStopIcon />}
            color="#d97706"
            bg="#fbf1e2"
            label="Break"
            desc="Pause the timer without changing the task's status."
          />
          <DocsIconRow
            icon={<HandStopIcon />}
            color="#4f46e5"
            bg="#eef2ff"
            label="Resume"
            desc="Same icon as Break, a different color: restarts a paused timer."
          />
          <DocsIconRow
            icon={<FlagIcon />}
            color="#16a34a"
            bg="#e8f7ef"
            label="Done"
            desc="Mark the task as complete. Moves it to Declared, waiting for approval."
          />
          <DocsIconRow
            icon={<AlertTriangleIcon />}
            color="#dc2626"
            bg="#fdeaea"
            label="Report a problem"
            desc="Flag what's blocking the task. See Blockers below."
          />
        </div>
        <p>
          Clicking Done asks you to confirm, then offers to add a short comment for whoever approves it (what
          you actually did, or anything worth flagging). The comment is optional.
        </p>

        <h2 id="priorities">Priorities</h2>
        <p>
          A task can be Low, Normal, High, or Urgent. Normal is the default and doesn&apos;t show a badge, to
          keep the task list readable; the other three show a colored badge on the card.
        </p>

        <h2 id="blockers">Blockers</h2>
        <p>
          If a task can&apos;t move forward, the assignee or a manager can report a blocker: a short, required
          reason for why it&apos;s stuck. This is available on any task that&apos;s In progress.
        </p>
        <ul>
          <li>Reporting a blocker is visible to everyone with access to the task, with who reported it and when.</li>
          <li><strong>Resolve</strong> (manager only): the blocker was real, and is now fixed. Keeps a record of it.</li>
          <li><strong>Retract</strong> (the person who reported it, or a manager): the blocker never should have existed. Removes it entirely.</li>
        </ul>
        <p>A task with an unresolved blocker is flagged at risk or blocked, and shows up on the Dashboard&apos;s &quot;Needs your attention&quot; list.</p>

        <h2 id="moving">Moving and reassigning</h2>
        <p>
          An unassigned task can be picked up with &quot;Assign to me&quot;, or a manager can assign it to
          anyone in the office with &quot;Assign to&quot;. A manager can also move a task to a different
          subject within the same office&apos;s BrainDumper with &quot;Move to&quot;, if it was filed under the
          wrong one.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
