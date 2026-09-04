'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'office-chat', label: "Chat de l'office" },
  { id: 'direct', label: 'Messages directs' },
  { id: 'mentions', label: 'Mentions et fichiers' },
];

export default function ChatDocsPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="chat" toc={TOC} locale="fr">
        <h1>Chat</h1>
        <p>OOffix a deux types de chat distincts : un par office, et un pour les conversations directes entre deux personnes.</p>

        <h2 id="office-chat">Chat de l&apos;office</h2>
        <p>
          Chaque office a son propre chat, visible par tous ses membres, distinct de celui de tout autre
          office et de ses Subjects de BrainDumper. Utilisez-le pour tout ce qui n&apos;est pas destiné à
          devenir une tâche : questions, coordination, une info rapide.
        </p>

        <h2 id="direct">Messages directs</h2>
        <p>
          Depuis la page Chat dans la barre latérale, démarrez une conversation en tête-à-tête avec
          n&apos;importe qui dans votre organisation, peu importe les offices auxquels vous appartenez
          chacun. Les conversations existantes y sont listées, triées par message le plus récent.
        </p>

        <h2 id="mentions">Mentions et fichiers</h2>
        <p>
          Tapez @ suivi d&apos;un nom pour mentionner quelqu&apos;un directement dans le chat d&apos;un
          office. Il est notifié même s&apos;il ne regarde pas cette conversation à ce moment-là. Le chat
          d&apos;office comme les messages directs permettent d&apos;envoyer des fichiers.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
