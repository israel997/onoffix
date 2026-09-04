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
  { id: 'what', label: "Ce qu'est un office" },
  { id: 'members', label: 'Membres' },
  { id: 'adding', label: 'Ajouter quelqu’un à un office' },
  { id: 'settings', label: "Réglages de l'office" },
  { id: 'alerts', label: 'Alertes' },
];

export default function OfficesPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="offices" toc={TOC} locale="fr">
        <h1>Offices</h1>
        <p>
          Un office (bureau) est là où le travail se passe réellement : il regroupe une équipe, ses tâches,
          son chat, et son propre rythme de check-in. La majeure partie de votre journée sur OOffix se passe
          dans un office ou un autre.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/offices-list.png" alt="La liste des Offices, une carte par équipe" />
          <figcaption>Chaque office visible par votre compte, une carte chacun.</figcaption>
        </figure>

        <h2 id="what">Ce qu&apos;est un office</h2>
        <p>Pensez à un office comme une équipe ou un département : ingénierie, ventes, un compte client précis. Chaque office a :</p>
        <ul>
          <li>Une liste de membres, avec pour chacun un rôle interne (une étiquette libre comme &quot;Developer&quot;).</li>
          <li>Des tâches, organisées par sujet dans son BrainDumper (voir <Link href="/fr/docs/organizer">BrainDumper</Link>).</li>
          <li>Un chat, distinct de celui de tout autre office.</li>
          <li>Une heure de check-in et des réglages de rappel.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/office-team-stats.png" alt="L'onglet Overview d'un office avec ses statistiques" />
          <figcaption>La vue d&apos;ensemble d&apos;un office : tâches, progression, en cours, faites, bloquées, échéances tenues.</figcaption>
        </figure>

        <h2 id="members">Membres</h2>
        <p>
          Seules les personnes déjà présentes dans votre organisation peuvent être ajoutées à un office ;
          si quelqu&apos;un est totalement nouveau, ajoutez-le d&apos;abord au niveau de l&apos;organisation
          (page Members). Ajouter quelqu&apos;un à un office lui envoie une invitation qu&apos;il doit
          accepter avant d&apos;apparaître dans la liste des membres, les tâches, et le chat de cet office.
        </p>

        <h2 id="adding">Ajouter quelqu&apos;un à un office</h2>
        <ol>
          <li>Ouvrez l&apos;office, et utilisez le bouton d&apos;ajout de membre sur sa page d&apos;ensemble.</li>
          <li>Choisissez-le parmi les membres de l&apos;organisation pas encore dans cet office.</li>
          <li>Donnez-lui éventuellement une étiquette de rôle interne, affichée à côté de son nom dans cet office.</li>
          <li>Il reçoit une notification et une invitation ; rien ne change pour lui tant qu&apos;il ne l&apos;a pas acceptée.</li>
        </ol>
        <DocsCallout locale="fr">
          <p>
            Manager ou Collaborator ne se choisit plus ici : c&apos;est réglé une fois pour toute
            l&apos;organisation. Voir <Link href="/fr/docs/roles">Roles &amp; permissions</Link>.
          </p>
        </DocsCallout>

        <h2 id="settings">Réglages de l&apos;office</h2>
        <p>Accessibles à une Authority, ou à un Manager membre de l&apos;office, depuis son onglet Settings :</p>
        <ul>
          <li><strong>Heure de check-in quotidien et fuseau horaire</strong> : quand la journée est considérée &quot;close&quot; pour cet office.</li>
          <li><strong>Délai de rappel</strong> : combien de temps après l&apos;heure de check-in relancer ceux qui n&apos;ont pas encore déclaré.</li>
          <li><strong>Classement de fiabilité</strong> : visible par toute l&apos;équipe, ou seulement par les managers.</li>
          <li><strong>Couleur et photo</strong> : comment l&apos;office apparaît sur la liste des Offices.</li>
          <li><strong>Suppression de l&apos;office</strong> : retire définitivement ses tâches, projets et historique de chat. Réservé à une Authority.</li>
        </ul>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/office-settings.png" alt="Le formulaire de réglages d'un office" width={520} />
          <figcaption>Nom, heure de check-in, fuseau horaire, délai de rappel, visibilité du classement, couleur.</figcaption>
        </figure>

        <h2 id="alerts">Alertes</h2>
        <p>
          Une Authority peut signaler un office en alerte (orange) ou en feu (rouge), pour un nombre choisi
          de jours et d&apos;heures. Tant que c&apos;est actif, la carte de l&apos;office est colorée sur la
          liste des Offices, et une bannière apparaît pour quiconque y entre. Utile pour faire remonter une
          équipe qui a besoin d&apos;attention sans écrire un message à tout le monde.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/office-alerts.png" alt="Statut d'alerte et zone de danger dans les réglages d'un office" width={520} />
          <figcaption>Régler une alerte, et la zone de danger de suppression de l&apos;office juste en dessous.</figcaption>
        </figure>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
