'use client';

import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import '../landing.css';

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

/** true = inclus, false = non inclus, string = valeur précise (ex. "10 GB"). */
type CompareValue = boolean | string;

interface CompareRow {
  label: string;
  values: [CompareValue, CompareValue, CompareValue];
}

const COMPARE_ROWS: CompareRow[] = [
  { label: 'Offices', values: ['1', '5 (+$1/extra office)', '10 (+$0.80/extra office)'] },
  { label: 'Seats', values: ['Up to 3', 'Unlimited', 'Unlimited'] },
  { label: 'BrainDumper (AI assistant)', values: ['10 messages/day', 'Unlimited', 'Unlimited'] },
  { label: 'File storage', values: ['500 MB', '10 GB', 'Unlimited'] },
  { label: 'Daily check-in & task tracking', values: [true, true, true] },
  { label: 'Performance stats & reliability leaderboard', values: [false, true, true] },
  { label: 'Advanced reporting & CSV/PDF export', values: [false, false, true] },
  { label: 'Priority support', values: [false, false, true] },
];

function CompareCell({ value }: { value: CompareValue }) {
  if (value === true) return <CheckIcon />;
  if (value === false) return <span className="compare-dash">–</span>;
  return <span>{value}</span>;
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
    floor: 'Ground floor',
    name: 'Free',
    tagline: 'For a small team getting started.',
    price: 0,
    trial: false,
    featured: false,
    features: [
      '1 office',
      'Up to 3 seats',
      'BrainDumper - 10 messages/day',
      '500 MB file storage',
      'Daily check-in & task tracking',
    ],
  },
  {
    key: 'growth',
    floor: '1st floor',
    name: 'Growth',
    tagline: 'For a team that outgrew a single office.',
    price: 19,
    trial: true,
    featured: true,
    features: [
      '5 offices included - $1/extra office',
      'Unlimited seats',
      'BrainDumper - unlimited',
      '10 GB file storage',
      'Performance stats & reliability leaderboard',
    ],
  },
  {
    key: 'scale',
    floor: '2nd floor',
    name: 'Scale',
    tagline: 'For agencies running multiple teams.',
    price: 39,
    trial: true,
    featured: false,
    features: [
      '10 offices included - $0.80/extra office',
      'Unlimited seats',
      'BrainDumper - unlimited',
      'Unlimited file storage',
      'Advanced reporting & CSV/PDF export',
      'Priority support',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} landing`}>
      <LandingHeader />

      <section className="hero" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <div className="section-head center" style={{ margin: '0 auto' }}>
            <span className="eyebrow">Pricing</span>
            <h2>One office, or a whole building.</h2>
            <p>Start free. Upgrade when your team grows past one office.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="plan-grid">
            {PLANS.map((plan) => (
              <div key={plan.key} className={`plan-card ${plan.featured ? 'featured' : ''}`}>
                {plan.featured && <span className="plan-badge">Most popular</span>}
                <span className="eyebrow">{plan.floor}</span>
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-tagline">{plan.tagline}</p>
                <div className="plan-price">
                  <span className="amount">${plan.price}</span>
                  <span className="period">/month</span>
                </div>
                <div className="plan-trial">{plan.trial ? '7-day free trial, no card required' : 'Forever free'}</div>
                <Link href="/register" className={`btn plan-cta ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}>
                  {plan.price === 0 ? 'Start for free' : 'Start free trial'}
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
            <h2>Compare plans in detail.</h2>
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
            <h2>Questions?</h2>
            <p>
              Need something specific - more seats on Free, a custom plan for a larger org? Reach out and
              we&apos;ll figure it out together.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
