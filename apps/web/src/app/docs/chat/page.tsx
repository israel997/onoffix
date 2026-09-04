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
  { id: 'office-chat', label: 'Office chat' },
  { id: 'direct', label: 'Direct messages' },
  { id: 'mentions', label: 'Mentions and files' },
];

export default function ChatDocsPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="chat" toc={TOC}>
        <h1>Chat</h1>
        <p>OOffix has two separate kinds of chat: one per office, and one for direct conversations between two people.</p>

        <h2 id="office-chat">Office chat</h2>
        <p>
          Each office has its own chat, visible to everyone in it, separate from every other office&apos;s
          chat and from its BrainDumper Subjects. Use it for anything that&apos;s not meant to become a task:
          questions, coordination, a quick heads up.
        </p>

        <h2 id="direct">Direct messages</h2>
        <p>
          From the Chat page in the sidebar, start a one on one conversation with anyone in your organisation,
          regardless of which offices you each belong to. Existing conversations are listed there, ordered by
          the most recent message.
        </p>

        <h2 id="mentions">Mentions and files</h2>
        <p>
          Type @ followed by a name to mention someone directly in an office chat. They get notified even if
          they&apos;re not currently looking at that conversation. Both office chat and direct messages support
          sending files.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
