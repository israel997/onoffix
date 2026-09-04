'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'individual', label: 'Statistiques individuelles' },
  { id: 'leaderboard', label: 'Classement de fiabilité' },
  { id: 'journal', label: 'Journal quotidien' },
];

export default function PerformanceDocsPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="performance" toc={TOC} locale="fr">
        <h1>Performance</h1>
        <p>Des chiffres plutôt que des impressions : combien de travail a été fait, avec quelle régularité, et par qui.</p>

        <h2 id="individual">Statistiques individuelles</h2>
        <p>Chacun peut voir ses propres statistiques sur une période choisie. Une Authority peut voir celles de n&apos;importe qui. Les chiffres couvrent :</p>
        <ul>
          <li><strong>Tâches assignées</strong> et <strong>tâches terminées</strong> sur la période.</li>
          <li><strong>Renvoyées pour reprise</strong> : combien de fois un manager n&apos;a pas approuvé du premier coup.</li>
          <li><strong>Heures travaillées</strong>, calculées depuis les sessions de chrono sur les tâches In progress.</li>
          <li><strong>Taux de déclaration à temps</strong> : à quelle fréquence le check-in a eu lieu quand il le fallait.</li>
          <li><strong>Échéances tenues</strong> : la part des tâches avec échéance validées avant celle-ci.</li>
          <li><strong>Blocages rencontrés</strong> sur la période.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/performance-stats.png" alt="Les statistiques de la page Performance pour une période" />
          <figcaption>Choisissez une période, obtenez tous les chiffres d&apos;un coup.</figcaption>
        </figure>

        <h2 id="leaderboard">Classement de fiabilité</h2>
        <p>
          Chaque office peut afficher un classement de ses membres par fiabilité sur une période. Que toute
          l&apos;équipe puisse le voir, ou seulement les managers, se règle dans les{' '}
          <Link href="/fr/docs/offices">réglages</Link> de cet office.
        </p>
        <DocsCallout locale="fr" tone="warn">
          <p>
            Pensé pour repérer des tendances, pas pour pointer du doigt. Désactivez-le pour une équipe où ça
            ferait plus de mal que de bien.
          </p>
        </DocsCallout>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/performance-leaderboard.png" alt="Activité quotidienne et classement de fiabilité" width={520} />
          <figcaption>Activité quotidienne, et le classement pour un office choisi.</figcaption>
        </figure>

        <h2 id="journal">Journal quotidien</h2>
        <p>
          Une liste jour par jour de ce qui a été validé, pour que vous (ou votre manager) puissiez revoir
          n&apos;importe quelle date passée sans fouiller tâche par tâche.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
