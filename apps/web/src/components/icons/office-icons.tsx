import type { SVGProps } from 'react';

/** Porte + tableau de contrôle — Dashboard : la salle des commandes du bureau. */
export function DoorControlIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 21V4.5C6 3.67 6.67 3 7.5 3H13V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 21h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="15.5" y="7" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.3" cy="9.2" r="0.9" fill="currentColor" />
      <path d="M17 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Porte simple — "entrer" dans un bureau. */
export function DoorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="2.5" width="12" height="19" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 21.5h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13.3" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/** Chaise — ajouter un siège / une personne. */
export function ChairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M7 3v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13v8M16 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 21h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.5 5.5v4M16.5 7.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Sortie — retirer quelqu'un. */
export function ExitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 21H5.5A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3H10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 16l5-4-5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Avion en papier — envoyer un message. */
export function PaperPlaneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M21 3 3 10.5l7.5 3L14 21l7-18Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.5 13.5 21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Personne + — démarrer une conversation avec quelqu'un. */
export function PersonPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="9.5" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 20c0-3.31 2.69-6 6-6s6 2.69 6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M18.5 8v6M15.5 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
