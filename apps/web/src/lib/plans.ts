/** Plan data shared between the public /pricing page and the in-app "current plan" modal. */

export type PlanKey = 'free' | 'growth' | 'scale';

export interface Plan {
  key: PlanKey;
  floor: string;
  name: string;
  tagline: string;
  price: number;
  trial: boolean;
  featured: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
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

/** `Organisation.planAbonnement` is a nullable free-text field — null/'FREE' both mean Free. */
export function planKeyFromAbonnement(planAbonnement: string | null | undefined): PlanKey {
  const normalized = (planAbonnement ?? 'FREE').toUpperCase();
  if (normalized === 'GROWTH') return 'growth';
  if (normalized === 'SCALE') return 'scale';
  return 'free';
}

export function getPlan(key: PlanKey): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export function nextPlan(key: PlanKey): Plan | null {
  const index = PLANS.findIndex((p) => p.key === key);
  return index === -1 || index === PLANS.length - 1 ? null : PLANS[index + 1];
}
