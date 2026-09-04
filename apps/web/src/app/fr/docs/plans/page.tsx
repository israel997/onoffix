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

interface PlanFr {
  key: string;
  name: string;
  tagline: string;
  price: number;
  features: string[];
}

const PLANS: PlanFr[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Pour une petite équipe qui démarre.',
    price: 0,
    features: [
      '1 office',
      "Jusqu'à 3 sièges",
      'BrainDumper - 10 messages/jour',
      '500 Mo de stockage',
      'Check-in quotidien & suivi des tâches',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'Pour une équipe qui a dépassé un seul office.',
    price: 19,
    features: [
      '5 offices inclus - 1$/office supplémentaire',
      'Sièges illimités',
      'BrainDumper illimité',
      '10 Go de stockage',
      'Statistiques de performance & classement de fiabilité',
    ],
  },
  {
    key: 'scale',
    name: 'Scale',
    tagline: 'Pour les agences qui gèrent plusieurs équipes.',
    price: 39,
    features: [
      '10 offices inclus - 0,80$/office supplémentaire',
      'Sièges illimités',
      'BrainDumper illimité',
      'Stockage illimité',
      'Rapports avancés & export CSV/PDF',
      'Support prioritaire',
    ],
  },
];

const TOC: TocEntry[] = [
  { id: 'free-org-limit', label: 'Une seule organisation Free par compte' },
  ...PLANS.map((p) => ({ id: p.key, label: p.name })),
  { id: 'seeing-your-plan', label: 'Voir votre plan' },
];

export default function PlansDocsPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />
      <DocsShell activeSlug="plans" toc={TOC} locale="fr">
        <h1>Plans &amp; billing</h1>
        <p>
          OOffix a trois plans. Ils diffèrent surtout par le nombre d&apos;offices que vous pouvez gérer et
          la place de stockage disponible pour votre équipe ; la boucle de check-in quotidien elle-même est
          la même sur tous les plans. Voir la page{' '}
          <Link href="/fr/pricing">tarifs</Link> complète pour une comparaison côte à côte.
        </p>

        <h2 id="free-org-limit">Une seule organisation Free par compte</h2>
        <DocsCallout locale="fr">
          <p>
            Un compte ne peut posséder qu&apos;une seule organisation au plan Free à la fois. Mettez-la à
            niveau, ou créez la suivante depuis un autre compte.
          </p>
        </DocsCallout>

        {PLANS.map((plan) => (
          <div key={plan.key}>
            <h2 id={plan.key}>{plan.name}</h2>
            <p>
              {plan.tagline} {plan.price === 0 ? 'Gratuit, pour toujours.' : `${plan.price}$/mois, avec un essai gratuit de 7 jours.`}
            </p>
            <ul>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ))}

        <h2 id="seeing-your-plan">Voir votre plan</h2>
        <p>
          Depuis le Dashboard, la carte de plan affiche le plan actuel de votre organisation ; cliquez
          dessus pour voir ce qui est inclus et ce que la mise à niveau débloque.
        </p>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/docs-img/dashboard.png" alt="Le Dashboard, avec la carte de plan à côté d'Offices et My Space" />
          <figcaption>La carte de plan est juste à côté d&apos;Offices et My Space sur le Dashboard.</figcaption>
        </figure>
      </DocsShell>
      <LandingFooter />
    </div>
  );
}
