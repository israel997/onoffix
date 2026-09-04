import type { DocsNavItem } from './docs-nav';

/**
 * Mêmes slugs que docs-nav.ts (le switch de langue ne fait que préfixer /fr, il ne
 * traduit pas les URLs). Les titres restent ceux de l'app (toujours en anglais tant
 * que l'app elle-même n'est pas traduite) ; seules les descriptions sont en français.
 */
export const DOCS_NAV_FR: DocsNavItem[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: "Ce qu'est OOffix, et comment configurer votre premier bureau.",
  },
  {
    slug: 'roles',
    title: 'Roles & permissions',
    description: 'Owner, Authority, Manager, Collaborator : qui peut faire quoi.',
  },
  {
    slug: 'offices',
    title: 'Offices',
    description: 'Membres, réglages et alertes pour chaque équipe.',
  },
  {
    slug: 'tasks',
    title: 'Tasks',
    description: "Le cycle de vie complet d'une tâche, et ce que fait chaque bouton d'action.",
  },
  {
    slug: 'check-in',
    title: 'Check-In & Validations',
    description: "Comment une équipe déclare sa journée, et comment un manager l'approuve.",
  },
  {
    slug: 'organizer',
    title: 'BrainDumper',
    description: 'Transformez un chat en vrac en tâches organisées et classées.',
  },
  {
    slug: 'chat',
    title: 'Chat',
    description: 'Chat de bureau et messages directs.',
  },
  {
    slug: 'calendar',
    title: 'Calendar',
    description: 'Toutes les échéances à venir, pour vous ou toute l’équipe.',
  },
  {
    slug: 'performance',
    title: 'Performance',
    description: 'Statistiques, échéances tenues, et classement de fiabilité.',
  },
  {
    slug: 'plans',
    title: 'Plans & billing',
    description: 'Ce qui change entre Free, Growth et Scale.',
  },
];
