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
  { id: 'idea', label: "L'idée" },
  { id: 'subjects', label: 'Subjects' },
  { id: 'from-chat-to-task', label: "Du chat à la tâche" },
  { id: 'manual', label: 'Ajouter une tâche manuellement' },
  { id: 'personal', label: 'Votre propre BrainDumper' },
];

export default function OrganizerPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="organizer" toc={TOC} locale="fr">
        <h1>BrainDumper</h1>
        <p>
          BrainDumper est l&apos;endroit où le travail commence avant même d&apos;être une tâche : un
          espace pour noter les choses telles qu&apos;elles vous viennent, qui les transforme en tâches
          organisées et classées pour vous.
        </p>

        <h2 id="idea">L&apos;idée</h2>
        <p>
          La plupart des tâches ne commencent pas comme un élément propre et bien formé d&apos;une to-do
          list. Elles commencent comme un message : &quot;faut corriger la page de connexion avant
          vendredi&quot;, une note vocale, ou une idée à moitié formée en réunion. BrainDumper vous laisse
          écrire ça tel quel, dans un chat, et transforme les parties actionnables en vraies tâches
          automatiquement.
        </p>

        <h2 id="subjects">Subjects</h2>
        <p>
          Le BrainDumper de chaque office est organisé en Subjects : des sujets que vous créez pour
          regrouper des messages et des tâches liés (un nom de projet, un client, un thème, tout ce qui a
          du sens pour cet office). Chaque office démarre avec un Subject par défaut, et vous pouvez en
          créer autant que nécessaire.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/organizer-subjects.png" alt="Le BrainDumper d'un office : sujets, chat, et le formulaire manuel de tâche" />
          <figcaption>Les Subjects en haut, le chat du sujet sélectionné, et la création manuelle de tâche à droite.</figcaption>
        </figure>

        <h2 id="from-chat-to-task">Du chat à la tâche</h2>
        <p>
          Écrivez dans le chat d&apos;un Subject comme dans n&apos;importe quelle app de messagerie. Quand
          un message décrit quelque chose d&apos;actionnable, il est repéré et transformé en tâche sous ce
          Subject, assignée si vous avez nommé quelqu&apos;un, avec une priorité et une échéance si vous en
          avez mentionné une.
        </p>
        <DocsCallout locale="fr">
          <p>
            Ça tourne en arrière-plan, donc une tâche peut mettre un court instant à apparaître après
            l&apos;envoi du message. Rien n&apos;est perdu pendant le traitement.
          </p>
        </DocsCallout>

        <h2 id="manual">Ajouter une tâche manuellement</h2>
        <p>
          Si vous préférez sauter le chat entièrement, un manager peut ajouter une tâche directement depuis
          la page BrainDumper : un titre, une description optionnelle, et le Subject auquel elle appartient.
        </p>

        <h2 id="personal">Votre propre BrainDumper</h2>
        <p>
          My Space a le même mécanisme, privé à vous : notez des choses, obtenez des tâches, sans étape
          d&apos;approbation manager puisque vous seul les voyez.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/organizer-personal.png" alt="Le BrainDumper personnel de My Space" />
          <figcaption>Le même mécanisme, dans My Space, privé à vous.</figcaption>
        </figure>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
