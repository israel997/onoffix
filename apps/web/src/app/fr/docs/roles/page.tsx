'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import '../../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'four-levels', label: 'Les quatre niveaux' },
  { id: 'owner', label: 'Owner' },
  { id: 'authority', label: 'Authority' },
  { id: 'manager', label: 'Manager' },
  { id: 'collaborator', label: 'Collaborator' },
  { id: 'changing', label: 'Changer le rôle de quelqu’un' },
  { id: 'transfer', label: 'Transférer la propriété' },
];

export default function RolesPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="roles" toc={TOC} locale="fr">
        <h1>Roles &amp; permissions</h1>
        <p>
          Chaque personne a un seul rôle pour toute l&apos;organisation, réglé une fois sur la page Members.
          Il s&apos;applique partout où elle va, donc vous n&apos;avez jamais à re-choisir un rôle à chaque
          fois que quelqu&apos;un rejoint un nouveau bureau.
        </p>

        <h2 id="four-levels">Les quatre niveaux</h2>
        <p>Du plus large au plus limité :</p>
        <ol>
          <li><strong>Owner</strong> : unique, transférable.</li>
          <li><strong>Authority</strong> : accès complet à toute l&apos;organisation.</li>
          <li><strong>Manager</strong> : droits d&apos;approbation, limités aux bureaux dont il fait partie.</li>
          <li><strong>Collaborator</strong> : travaille sur ses propres tâches.</li>
        </ol>

        <h2 id="owner">Owner</h2>
        <p>
          Chaque organisation a exactement un Owner : celui ou celle qui l&apos;a créée, sauf si la
          propriété a été transférée depuis. Deux actions sont réservées à l&apos;Owner seul :
        </p>
        <ul>
          <li>Transférer la propriété à quelqu&apos;un d&apos;autre.</li>
          <li>Supprimer l&apos;organisation.</li>
        </ul>
        <p>
          En dehors de ces deux actions, l&apos;Owner n&apos;a pas besoin de traitement particulier : il
          détient généralement aussi Authority, ce qui couvre tout le reste.
        </p>

        <h2 id="authority">Authority</h2>
        <p>Une Authority a accès à tous les bureaux de l&apos;organisation, même ceux qu&apos;elle n&apos;a jamais explicitement rejoints. Elle peut :</p>
        <ul>
          <li>Voir et gérer chaque bureau, ses membres, et ses réglages.</li>
          <li>Inviter, retirer, et changer le rôle de n&apos;importe quel membre (sauf celui de l&apos;Owner).</li>
          <li>Signaler un bureau en alerte (orange ou rouge) pour une durée choisie.</li>
          <li>Modifier les réglages de l&apos;organisation : nom, logo.</li>
          <li>Voir le calendrier des tâches de toute l&apos;organisation et les statistiques de chacun.</li>
        </ul>
        <DocsCallout locale="fr">
          <p>
            Authority est un rôle d&apos;organisation. C&apos;est différent du panneau d&apos;administration
            de la plateforme OOffix elle-même, réservé à la personne qui opère OOffix et sans rapport avec
            votre organisation.
          </p>
        </DocsCallout>

        <h2 id="manager">Manager</h2>
        <p>Un Manager obtient des droits d&apos;approbation, mais seulement dans les bureaux dont il est déjà membre. Dans ces bureaux, il peut :</p>
        <ul>
          <li>Approuver ou renvoyer une tâche que quelqu&apos;un a marquée comme terminée.</li>
          <li>Ajouter et retirer des membres.</li>
          <li>Déplacer une tâche vers un autre sujet, ou la réassigner.</li>
          <li>Résoudre un blocage signalé.</li>
          <li>Modifier les réglages de ce bureau (heure de check-in, fuseau horaire, visibilité du classement de fiabilité).</li>
        </ul>
        <p>
          Un Manager ne voit pas automatiquement les bureaux qu&apos;il n&apos;a pas rejoints. Être Manager,
          c&apos;est un niveau de confiance une fois dans la pièce, pas un accès illimité à toutes les
          pièces.
        </p>

        <h2 id="collaborator">Collaborator</h2>
        <p>Le niveau par défaut. Un Collaborator peut, sur les tâches qui lui sont assignées :</p>
        <ul>
          <li>Accepter, démarrer, mettre en pause, reprendre, et marquer une tâche comme terminée.</li>
          <li>Signaler un blocage sur une tâche en cours.</li>
          <li>Prendre une tâche non assignée dans un bureau dont il fait partie.</li>
          <li>Utiliser le chat, le calendrier, et ses propres statistiques de performance.</li>
        </ul>

        <h2 id="changing">Changer le rôle de quelqu&apos;un</h2>
        <p>
          Allez sur la page Members. Une Authority peut y changer le rôle de n&apos;importe qui d&apos;un
          seul menu déroulant : Authority, Manager, ou Collaborator. La ligne de l&apos;Owner est fixe et
          ne peut pas être changée depuis ce menu ; voir ci-dessous pour transférer la propriété à la place.
        </p>

        <h2 id="transfer">Transférer la propriété</h2>
        <p>
          Seul l&apos;Owner actuel peut le faire. Sur la page Members, à côté de la personne à qui vous
          voulez transmettre la propriété, utilisez &quot;Make owner&quot;. Elle devient immédiatement seule
          Owner ; vous gardez le rôle que vous aviez par ailleurs (généralement Authority, pour ne perdre
          accès à rien d&apos;autre).
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
