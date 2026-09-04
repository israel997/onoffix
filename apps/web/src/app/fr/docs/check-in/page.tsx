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
  { id: 'why', label: 'Pourquoi un check-in quotidien' },
  { id: 'office-checkin', label: "L'onglet Check-In d'un office" },
  { id: 'validations', label: 'La page Validations' },
  { id: 'reminders', label: 'Rappels' },
];

export default function CheckInPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="check-in" toc={TOC} locale="fr">
        <h1>Check-In &amp; Validations</h1>
        <p>
          C&apos;est la boucle quotidienne autour de laquelle OOffix est construit : quelqu&apos;un marque
          une tâche terminée, un manager le confirme. Aucune réunion de statut nécessaire.
        </p>

        <h2 id="why">Pourquoi un check-in quotidien</h2>
        <p>
          Une tâche marquée Done ne disparaît pas immédiatement : elle passe à Declared, et reste dans
          l&apos;onglet Check-In de son office jusqu&apos;à ce qu&apos;un manager l&apos;approuve ou la
          renvoie. Cette courte pause remplace une réunion de statut quotidienne : le manager passe en
          revue ce qui est arrivé, une fois, au lieu de demander à chacun.
        </p>

        <h2 id="office-checkin">L&apos;onglet Check-In d&apos;un office</h2>
        <p>
          Accessible depuis un office. Un manager y voit toutes les tâches en attente d&apos;approbation,
          sous &quot;Waiting for your approval&quot;, chacune avec le commentaire laissé par l&apos;assigné
          (le cas échéant) et deux actions :
        </p>
        <ul>
          <li><strong>Approve</strong> : la tâche passe à Validated. Définitif.</li>
          <li><strong>Send back</strong> : la tâche passe à Needs rework. L&apos;assigné la revoit et peut la reprendre.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/checkin-approve.png" alt="L'onglet Check-In d'un office, en attente d'approbation" />
          <figcaption>Waiting for your approval : chaque tâche avec son commentaire, Approve ou Send back.</figcaption>
        </figure>
        <p>
          Les tâches approuvées restent visibles en dessous, dans un historique repliable filtrable par
          date, pour que rien ne semble disparaître une fois validé.
        </p>
        <DocsCallout locale="fr">
          <p>
            Un Collaborator sans droits de manager dans cet office voit cet onglet en lecture seule : où
            en est le travail aujourd&apos;hui, sans les actions d&apos;approbation.
          </p>
        </DocsCallout>

        <h2 id="validations">La page Validations</h2>
        <p>Accessible depuis la barre latérale pour tout le monde, cette page donne une vue plus large sur chaque office dont vous faites partie :</p>
        <ul>
          <li><strong>Your day</strong> : une checklist personnelle des tâches du jour, pour déclarer ce que vous avez accompli.</li>
          <li><strong>Your teams&apos; Check-In</strong> : un raccourci vers chaque office que vous managez, directement vers son onglet Check-In.</li>
          <li><strong>Team validations today</strong> : un flux en lecture seule de qui a validé quoi, à travers chaque office dont vous faites partie (chaque office, pour une Authority).</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/validations-today.png" alt="La page Validations, déclaration des tâches du jour" />
          <figcaption>Your day : cochez ce que vous avez accompli, puis déclarez.</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/validations-teams-checkin.png" alt="Your teams' Check-In, une ligne par office" width={520} />
          <figcaption>Your teams&apos; Check-In : un raccourci vers chaque office que vous managez.</figcaption>
        </figure>

        <h2 id="reminders">Rappels</h2>
        <p>
          Chaque office a sa propre heure de check-in et un délai de rappel, réglés dans son onglet Settings
          (voir <Link href="/fr/docs/offices">Offices</Link>). Si quelqu&apos;un n&apos;a rien déclaré à ce
          moment-là, OOffix le relance, et prévient son manager.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
