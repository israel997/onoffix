'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { DocsCallout, DocsShell, type TocEntry } from '@/components/docs/docs-shell';
import { StructureDiagram } from '@/components/docs/structure-diagram';
import '../../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'what-is-ooffix', label: "Qu'est-ce qu'OOffix" },
  { id: 'organisation', label: 'Votre organisation' },
  { id: 'first-office', label: 'Votre premier bureau' },
  { id: 'inviting', label: 'Inviter votre équipe' },
  { id: 'next', label: 'Et ensuite' },
];

export default function GettingStartedPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="getting-started" toc={TOC} locale="fr">
        <h1>Démarrage</h1>
        <p>
          OOffix aide une équipe à gérer son quotidien sans une réunion pour chaque mise à jour. Cette page
          présente les premières choses à mettre en place : votre organisation, votre premier bureau, et
          votre équipe.
        </p>

        <h2 id="what-is-ooffix">Qu&apos;est-ce qu&apos;OOffix</h2>
        <p>
          OOffix repose sur une idée simple : une équipe déclare ce qu&apos;elle a fait chaque jour, et un
          manager le confirme, sans réunion de statut. Tout le reste (tâches, chat, calendrier, statistiques
          de performance) existe pour soutenir cette boucle.
        </p>
        <p>Trois notions reviennent partout dans le produit :</p>
        <ul>
          <li>
            <strong>Organisation</strong> : votre entreprise ou votre espace de travail. Toute personne que
            vous invitez appartient à une seule organisation.
          </li>
          <li>
            <strong>Office (bureau)</strong> : une équipe ou un département au sein de votre organisation
            (ingénierie, ventes, un compte client, tout ce qui regroupe des personnes et des tâches).
          </li>
          <li>
            <strong>Task (tâche)</strong> : l&apos;unité de travail. Elle traverse un petit nombre
            d&apos;étapes de sa création à sa complétion. Voir <Link href="/fr/docs/tasks">Tasks</Link> pour
            le cycle de vie complet.
          </li>
        </ul>
        <StructureDiagram locale="fr" />
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/sidebar-nav.png" alt="Navigation latérale d'OOffix" width={280} />
          <figcaption>Chaque section de l&apos;app, accessible en un clic depuis la barre latérale.</figcaption>
        </figure>

        <h2 id="organisation">Votre organisation</h2>
        <p>
          À l&apos;inscription, OOffix crée une organisation pour vous et vous en fait le propriétaire
          (Owner). L&apos;Owner est la seule personne pouvant transférer la propriété ou supprimer
          l&apos;organisation. La gestion au quotidien (membres, bureaux, rôles) ne nécessite pas
          d&apos;être l&apos;Owner : voir <Link href="/fr/docs/roles">Roles &amp; permissions</Link> pour
          le détail complet.
        </p>
        <DocsCallout locale="fr">
          <p>
            Un compte ne peut posséder qu&apos;une seule organisation au plan Free. Si vous en avez besoin
            d&apos;une deuxième, mettez à niveau la première, ou créez la nouvelle depuis un autre compte.
          </p>
        </DocsCallout>

        <h2 id="first-office">Votre premier bureau</h2>
        <p>Créez un bureau depuis la page Offices. Un bureau n&apos;a besoin que d&apos;un nom pour démarrer. Une fois créé, vous pouvez :</p>
        <ol>
          <li>Régler son heure de check-in quotidien et son fuseau horaire, dans son onglet Settings.</li>
          <li>Ajouter des membres qui appartiennent déjà à votre organisation.</li>
          <li>Lui donner une couleur et une photo, pour le reconnaître facilement sur la liste des Offices.</li>
        </ol>
        <p>Une organisation peut avoir jusqu&apos;à 10 bureaux, selon votre plan (voir <Link href="/fr/docs/plans">Plans &amp; billing</Link>).</p>

        <h2 id="inviting">Inviter votre équipe</h2>
        <p>
          Ajoutez d&apos;abord les personnes au niveau de l&apos;organisation, depuis la page Members :
          saisissez leur nom et leur email. Si elles ont déjà un compte OOffix, elles sont ajoutées
          immédiatement. Sinon, elles reçoivent une invitation par email pour définir leur propre mot de
          passe.
        </p>
        <p>
          Être membre de l&apos;organisation ne place pas encore la personne dans un bureau. Ajoutez-la à
          un bureau précis depuis la page de ce bureau ; elle recevra une invitation à accepter avant de
          réellement le rejoindre et de voir ses tâches et son chat.
        </p>

        <h2 id="next">Et ensuite</h2>
        <ul>
          <li><Link href="/fr/docs/roles">Roles &amp; permissions</Link> : qui peut faire quoi.</li>
          <li><Link href="/fr/docs/offices">Offices</Link> : réglages, membres, alertes.</li>
          <li><Link href="/fr/docs/tasks">Tasks</Link> : le cycle de vie complet et ce que fait chaque bouton.</li>
          <li><Link href="/fr/docs/check-in">Check-In &amp; Validations</Link> : comment une journée est déclarée puis approuvée.</li>
        </ul>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
