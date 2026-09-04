'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import '../../landing.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display-src',
});
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-src',
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-src',
});

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type CompareValue = boolean | string;

interface CompareRow {
  label: string;
  values: [CompareValue, CompareValue, CompareValue];
}

interface Plan {
  key: string;
  floor: string;
  name: string;
  tagline: string;
  price: number;
  trial: boolean;
  featured: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    key: 'free',
    floor: 'Rez-de-chaussée',
    name: 'Free',
    tagline: 'Pour une petite équipe qui démarre.',
    price: 0,
    trial: false,
    featured: false,
    features: [
      '1 bureau',
      "Jusqu'à 3 sièges",
      'BrainDumper - 10 messages/jour',
      '500 Mo de stockage',
      'Check-in quotidien & suivi des tâches',
    ],
  },
  {
    key: 'growth',
    floor: '1er étage',
    name: 'Growth',
    tagline: 'Pour une équipe qui a dépassé un seul bureau.',
    price: 19,
    trial: true,
    featured: true,
    features: [
      '5 bureaux inclus - 1$/bureau supplémentaire',
      'Sièges illimités',
      'BrainDumper illimité',
      '10 Go de stockage',
      'Statistiques de performance & classement de fiabilité',
    ],
  },
  {
    key: 'scale',
    floor: '2e étage',
    name: 'Scale',
    tagline: 'Pour les agences qui gèrent plusieurs équipes.',
    price: 39,
    trial: true,
    featured: false,
    features: [
      '10 bureaux inclus - 0,80$/bureau supplémentaire',
      'Sièges illimités',
      'BrainDumper illimité',
      'Stockage illimité',
      'Rapports avancés & export CSV/PDF',
      'Support prioritaire',
    ],
  },
];

const COMPARE_ROWS: CompareRow[] = [
  { label: 'Bureaux', values: ['1', '5 (+1$/bureau suppl.)', '10 (+0,80$/bureau suppl.)'] },
  { label: 'Sièges', values: ["Jusqu'à 3", 'Illimités', 'Illimités'] },
  { label: 'BrainDumper (assistant IA)', values: ['10 messages/jour', 'Illimité', 'Illimité'] },
  { label: 'Stockage fichiers', values: ['500 Mo', '10 Go', 'Illimité'] },
  { label: 'Check-in quotidien & suivi des tâches', values: [true, true, true] },
  { label: 'Statistiques de performance & classement de fiabilité', values: [false, true, true] },
  { label: 'Rapports avancés & export CSV/PDF', values: [false, false, true] },
  { label: 'Support prioritaire', values: [false, false, true] },
];

function CompareCell({ value }: { value: CompareValue }) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <span className="compare-dash">–</span>;
  return <span>{value}</span>;
}

export default function PricingPageFr() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />

      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="section-head center" style={{ margin: '0 auto' }}>
            <span className="eyebrow">Tarifs</span>
            <h2>Un bureau, ou tout un immeuble.</h2>
            <p>Commencez gratuitement. Passez à l&apos;étage supérieur quand votre équipe dépasse un bureau.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="plan-grid">
            {PLANS.map((plan) => (
              <div key={plan.key} className={`plan-card ${plan.featured ? 'featured' : ''}`}>
                {plan.featured && <span className="plan-badge">Le plus populaire</span>}
                <span className="eyebrow">{plan.floor}</span>
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-tagline">{plan.tagline}</p>
                <div className="plan-price">
                  <span className="amount">${plan.price}</span>
                  <span className="period">/mois</span>
                </div>
                <div className="plan-trial">
                  {plan.trial ? 'Essai gratuit de 7 jours, sans carte' : 'Gratuit pour toujours'}
                </div>
                <Link href="/register" className={`btn plan-cta ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}>
                  {plan.price === 0 ? 'Commencer gratuitement' : "Démarrer l'essai gratuit"}
                </Link>
                <div className="plan-features">
                  {plan.features.map((f) => (
                    <div key={f} className="plan-feature">
                      <CheckIcon />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="section-head center" style={{ margin: '0 auto' }}>
            <h2>Comparez les plans en détail.</h2>
          </div>

          <div className="compare">
            <div className="compare-row compare-head">
              <div className="compare-crit"></div>
              <div className="compare-cell">Free</div>
              <div className="compare-cell win">Growth</div>
              <div className="compare-cell">Scale</div>
            </div>
            {COMPARE_ROWS.map((row) => (
              <div key={row.label} className="compare-row">
                <div className="compare-crit">{row.label}</div>
                <div className="compare-cell" data-plan="Free">
                  <CompareCell value={row.values[0]} />
                </div>
                <div className="compare-cell win" data-plan="Growth">
                  <CompareCell value={row.values[1]} />
                </div>
                <div className="compare-cell" data-plan="Scale">
                  <CompareCell value={row.values[2]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head center" style={{ margin: '0 auto' }}>
            <h2>Des questions ?</h2>
            <p>
              Besoin de quelque chose de spécifique : plus de sièges sur Free, un plan sur mesure pour une
              grande organisation ? Contactez-nous, on trouvera une solution ensemble.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
