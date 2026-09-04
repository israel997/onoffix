export interface DocsNavItem {
  slug: string;
  title: string;
  description: string;
}

export const DOCS_NAV: DocsNavItem[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    description: 'What OOffix is, and how to set up your first office.',
  },
  {
    slug: 'roles',
    title: 'Roles & permissions',
    description: 'Owner, Authority, Manager, Collaborator: who can do what.',
  },
  {
    slug: 'offices',
    title: 'Offices',
    description: 'Members, settings and alerts for each team.',
  },
  {
    slug: 'tasks',
    title: 'Tasks',
    description: 'The full lifecycle of a task, and what each action button does.',
  },
  {
    slug: 'check-in',
    title: 'Check-In & Validations',
    description: 'How a team declares its day, and how a manager approves it.',
  },
  {
    slug: 'organizer',
    title: 'BrainDumper',
    description: 'Turn a raw chat into organized, classified tasks.',
  },
  {
    slug: 'chat',
    title: 'Chat',
    description: 'Office chat and direct messages.',
  },
  {
    slug: 'calendar',
    title: 'Calendar',
    description: 'See every deadline coming up, for you or the whole team.',
  },
  {
    slug: 'performance',
    title: 'Performance',
    description: 'Stats, deadlines met, and the reliability leaderboard.',
  },
  {
    slug: 'plans',
    title: 'Plans & billing',
    description: 'What changes between Free, Growth and Scale.',
  },
];
