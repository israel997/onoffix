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
  { id: 'idea', label: 'The idea' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'from-chat-to-task', label: 'From chat to task' },
  { id: 'manual', label: 'Adding a task manually' },
  { id: 'personal', label: 'Your own BrainDumper' },
];

export default function OrganizerPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="organizer" toc={TOC}>
        <h1>BrainDumper</h1>
        <p>
          BrainDumper is where work starts before it&apos;s a task: a place to write things down as they come
          to mind, that turns them into organized, classified tasks for you.
        </p>

        <h2 id="idea">The idea</h2>
        <p>
          Most tasks don&apos;t start as a clean, well-formed to do item. They start as a message: &quot;we
          need to fix the login page before Friday&quot;, or a voice note, or a half-formed idea in a meeting.
          BrainDumper lets you write that down as is, in a chat, and turns the actionable parts into real
          tasks automatically.
        </p>

        <h2 id="subjects">Subjects</h2>
        <p>
          Each office&apos;s BrainDumper is organized into Subjects: topics you create to group related
          messages and tasks (a project name, a client, a theme, whatever makes sense for that office). Every
          office starts with one default Subject, and you can create as many as you need.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/organizer-subjects.png" alt="An office's BrainDumper: subjects, chat, and the manual task form" />
          <figcaption>Subjects across the top, the chat for the selected one, and manual task creation on the right.</figcaption>
        </figure>

        <h2 id="from-chat-to-task">From chat to task</h2>
        <p>
          Write in a Subject&apos;s chat like you would in any messaging app. When a message describes
          something actionable, it gets picked up and turned into a task under that Subject, assigned if you
          named someone, with a priority and a due date if you mentioned one.
        </p>
        <DocsCallout>
          <p>
            This runs in the background, so a task can take a short moment to appear after you send the
            message. Nothing is lost while it processes.
          </p>
        </DocsCallout>

        <h2 id="manual">Adding a task manually</h2>
        <p>
          If you&apos;d rather skip the chat entirely, a manager can add a task directly from the BrainDumper
          page: a title, an optional description, and which Subject it belongs to.
        </p>

        <h2 id="personal">Your own BrainDumper</h2>
        <p>
          My Space has the same mechanism, private to you: write things down, get tasks out of it, with no
          manager approval step since only you can see them.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/organizer-personal.png" alt="My Space's personal BrainDumper" />
          <figcaption>The same mechanism, in My Space, private to you.</figcaption>
        </figure>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
