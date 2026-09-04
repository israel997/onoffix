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
  { id: 'what', label: 'Ce qui est affiché' },
  { id: 'views', label: 'Mes tâches vs toute l’organisation' },
  { id: 'editing', label: 'Modifier depuis le calendrier' },
];

export default function CalendarDocsPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="calendar" toc={TOC} locale="fr">
        <h1>Calendar</h1>
        <p>Une vue mensuelle de chaque tâche ayant une échéance, pour que rien ne vous surprenne à la dernière minute.</p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/calendar.png" alt="La page Calendar, vue mensuelle" />
          <figcaption>Un mois d&apos;un coup d&apos;œil, avec les tâches du jour sélectionné à droite.</figcaption>
        </figure>

        <h2 id="what">Ce qui est affiché</h2>
        <p>
          Seules les tâches avec une échéance apparaissent ici : toutes les tâches n&apos;en ont pas
          besoin, donc c&apos;est pensé comme une vue des échéances, pas une liste complète de tâches
          (c&apos;est le rôle de l&apos;onglet Tasks d&apos;un office).
        </p>

        <h2 id="views">Mes tâches vs toute l&apos;organisation</h2>
        <p>
          Par défaut vous voyez vos propres tâches, de chaque office dont vous faites partie plus votre
          BrainDumper personnel. Une Authority peut basculer vers une vue des échéances de toute
          l&apos;organisation, utile pour repérer une semaine où trop de choses tombent en même temps.
        </p>

        <h2 id="editing">Modifier depuis le calendrier</h2>
        <p>Cliquez sur une tâche pour l&apos;ouvrir : changez son échéance, sa priorité, ou supprimez-la, sans quitter le calendrier.</p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
