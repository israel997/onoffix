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
import '../../../landing.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display-src' });
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body-src' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono-src' });

const TOC: TocEntry[] = [
  { id: 'lifecycle', label: 'Le cycle de vie d’une tâche' },
  { id: 'personal', label: 'Tâches personnelles vs tâches d’office' },
  { id: 'icons', label: 'Icônes d’action' },
  { id: 'priorities', label: 'Priorités' },
  { id: 'blockers', label: 'Blocages' },
  { id: 'moving', label: 'Déplacer et réassigner' },
];

export default function TasksPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="tasks" toc={TOC} locale="fr">
        <h1>Tasks</h1>
        <p>
          Une tâche est l&apos;unité de travail dans OOffix. Elle traverse un petit nombre fixe de statuts,
          et chaque statut détermine quelle action est disponible ensuite, affichée comme une seule icône
          colorée sur la carte de tâche.
        </p>

        <h2 id="lifecycle">Le cycle de vie d&apos;une tâche</h2>
        <ol>
          <li><strong>To do</strong> : créée, assignée ou non, personne ne l&apos;a encore commencée.</li>
          <li><strong>Accepted</strong> : l&apos;assigné l&apos;a prise en charge, mais n&apos;a pas encore démarré le chrono.</li>
          <li><strong>In progress</strong> : le chrono tourne, ou est en pause (toujours &quot;In progress&quot;, juste sans session active).</li>
          <li><strong>Declared</strong> : l&apos;assigné l&apos;a marquée terminée. Elle attend maintenant l&apos;approbation d&apos;un manager.</li>
          <li><strong>Validated</strong> : un manager l&apos;a approuvée. C&apos;est l&apos;état final.</li>
          <li><strong>Needs rework</strong> : un manager l&apos;a renvoyée au lieu de l&apos;approuver. Elle repasse à In progress une fois reprise.</li>
        </ol>
        <p>
          Seul un manager (ou une Authority) peut faire passer une tâche Declared à Validated ou Needs
          rework, depuis l&apos;onglet Check-In de l&apos;office. Voir{' '}
          <Link href="/fr/docs/check-in">Check-In &amp; Validations</Link>.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/tasks-grouped.png" alt="Tâches regroupées par sujet, repliées" />
          <figcaption>L&apos;onglet Tasks d&apos;un office, regroupé par sujet.</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/tasks-expanded.png" alt="Un sujet déplié, montrant les cartes de tâches individuelles" />
          <figcaption>Déplié : chaque carte montre à qui elle est assignée et son statut actuel.</figcaption>
        </figure>

        <h2 id="personal">Tâches personnelles vs tâches d&apos;office</h2>
        <p>
          Une tâche peut vivre dans un office (visible par toute l&apos;équipe, soumise à l&apos;approbation
          d&apos;un manager) ou dans votre propre BrainDumper, sous My Space. Une tâche personnelle
          n&apos;a pas d&apos;étape manager : la cocher la valide immédiatement, puisque vous seul la voyez.
        </p>

        <h2 id="icons">Icônes d&apos;action</h2>
        <p>
          Chaque carte de tâche montre uniquement les actions pertinentes pour son statut actuel et pour qui
          la regarde. Pas de fond coloré, juste une icône teintée :
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/task-icon-accept.png" alt="Une tâche To do montrant l'icône Accept" width={420} />
          <figcaption>Une tâche To do qui vous est assignée : juste Accept.</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/task-icons-inprogress.png" alt="Une tâche In progress montrant Break, Done et Report a problem" />
          <figcaption>In progress : Break, Done, et Report a problem, avec Move to juste après.</figcaption>
        </figure>
        <div className="docs-icon-legend">
          <DocsIconRow
            icon={<DoubleCheckIcon />}
            color="#0b63f6"
            bg="#eaf1ff"
            label="Accept"
            desc="Prendre en charge une tâche To do qui vous est assignée. La fait passer à Accepted."
          />
          <DocsIconRow
            icon={<RocketIcon />}
            color="#16a34a"
            bg="#e8f7ef"
            label="Start / Resubmit"
            desc="Commencer à travailler : démarre le chrono et fait passer la tâche à In progress."
          />
          <DocsIconRow
            icon={<HandStopIcon />}
            color="#d97706"
            bg="#fbf1e2"
            label="Break"
            desc="Met le chrono en pause sans changer le statut de la tâche."
          />
          <DocsIconRow
            icon={<HandStopIcon />}
            color="#4f46e5"
            bg="#eef2ff"
            label="Resume"
            desc="Même icône que Break, une couleur différente : relance un chrono en pause."
          />
          <DocsIconRow
            icon={<FlagIcon />}
            color="#16a34a"
            bg="#e8f7ef"
            label="Done"
            desc="Marque la tâche comme terminée. La fait passer à Declared, en attente d'approbation."
          />
          <DocsIconRow
            icon={<AlertTriangleIcon />}
            color="#dc2626"
            bg="#fdeaea"
            label="Report a problem"
            desc="Signale ce qui bloque la tâche. Voir Blocages ci-dessous."
          />
        </div>
        <p>
          Cliquer sur Done demande une confirmation, puis propose d&apos;ajouter un court commentaire pour
          la personne qui approuvera (ce que vous avez réellement fait, ou tout ce qui mérite d&apos;être
          signalé). Le commentaire est optionnel.
        </p>

        <h2 id="priorities">Priorités</h2>
        <p>
          Une tâche peut être Low, Normal, High, ou Urgent. Normal est la valeur par défaut et n&apos;affiche
          pas de badge, pour garder la liste de tâches lisible ; les trois autres affichent un badge coloré
          sur la carte.
        </p>

        <h2 id="blockers">Blocages</h2>
        <p>
          Si une tâche ne peut pas avancer, l&apos;assigné ou un manager peut signaler un blocage : une
          raison courte et obligatoire expliquant pourquoi elle est bloquée. Disponible sur toute tâche
          In progress.
        </p>
        <ul>
          <li>Signaler un blocage est visible par tous ceux ayant accès à la tâche, avec qui l&apos;a signalé et quand.</li>
          <li><strong>Resolve</strong> (manager uniquement) : le blocage était réel, et est maintenant réglé. Garde une trace.</li>
          <li><strong>Retract</strong> (la personne qui l&apos;a signalé, ou un manager) : le blocage n&apos;aurait jamais dû exister. Le retire entièrement.</li>
        </ul>
        <p>
          Une tâche avec un blocage non résolu est signalée à risque ou bloquée, et apparaît dans la liste
          &quot;Needs your attention&quot; du Dashboard.
        </p>

        <h2 id="moving">Déplacer et réassigner</h2>
        <p>
          Une tâche non assignée peut être prise avec &quot;Assign to me&quot;, ou un manager peut
          l&apos;assigner à n&apos;importe qui dans l&apos;office avec &quot;Assign to&quot;. Un manager
          peut aussi déplacer une tâche vers un autre sujet au sein du même BrainDumper de l&apos;office
          avec &quot;Move to&quot;, si elle a été classée au mauvais endroit.
        </p>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
