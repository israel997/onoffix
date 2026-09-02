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

/** Fauteuil de bureau à roulettes — ajouter un siège / une personne. */
export function ChairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="7.5" y="2" width="9" height="9.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="12.2" width="14" height="3" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 9.3v3.4M18.5 9.3v3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 15.2v2.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12 17.5 7.3 20.8M12 17.5 16.7 20.8M12 17.5 12 21.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="7.3" cy="20.8" r="0.9" fill="currentColor" />
      <circle cx="16.7" cy="20.8" r="0.9" fill="currentColor" />
      <circle cx="12" cy="21.3" r="0.9" fill="currentColor" />
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

/** Mallette — les tâches qu'on transporte. */
export function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12.5h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.7 12.5h2.6v2h-2.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** Cloche de comptoir — l'accueil du bureau. */
export function ReceptionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5 16a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 16h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11.3 16V13.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="11.3" cy="12.4" r="1.1" fill="currentColor" />
      <path d="M4 19.5h14.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Immeuble — tous les bureaux de l'organisation. */
export function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="2.5" width="14" height="19" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 6.5h1.4M13.6 6.5H15M9 10.5h1.4M13.6 10.5H15M9 14.5h1.4M13.6 14.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.2 21.5v-4.2a1.8 1.8 0 0 1 3.6 0v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Bureau perso avec écran — My Space. */
export function DeskIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="8" y="3" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 9v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2.5 15.5h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 15.5V19M20 15.5V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 11.5h7v4h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Réveil — ce qui demande de l'attention / les prochaines échéances. */
export function AlarmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="13" r="7.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 9v4l2.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 4 2.5 6.5M19 4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.5 2.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Escalier — on change d'étage/de niveau dans la navigation. */
export function StairsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 20h4v-4h4v-4h4V8h4V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Graphique en barres — statistiques d'équipe. */
export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3.5 20.5h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5.5" y="13" width="3.2" height="7.5" rx="0.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.4" y="8.5" width="3.2" height="12" rx="0.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="15.3" y="3.5" width="3.2" height="17" rx="0.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Groupe — l'équipe d'un bureau. */
export function GroupIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="8.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.3" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 20c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14.8 14.3c2.6.4 4.7 2.5 4.7 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Table de réunion vue du dessus — l'espace de discussion d'équipe. */
export function MeetingRoomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <ellipse cx="12" cy="12" rx="6.5" ry="4.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="4.3" r="1.3" fill="currentColor" />
      <circle cx="12" cy="19.7" r="1.3" fill="currentColor" />
      <circle cx="3.3" cy="12" r="1.3" fill="currentColor" />
      <circle cx="20.7" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Clé — gérer un espace (paramètres d'un bureau). */
export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="7" cy="15" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 12 19.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.5 5.5 19 8M19.5 2.5 22 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Trousseau — la clé maîtresse (gérer toute l'organisation). */
export function MasterKeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l9.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 16l2.2-2.2M19 19l2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Badge d'accès — identité personnelle. */
export function IdBadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="4.5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.5 2.5h5v3.5h-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9.5" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.8 17.5c.5-1.6 1.6-2.4 2.7-2.4s2.2.8 2.7 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14.5 11h3.5M14.5 14h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Calendrier mural — la section Calendar. */
export function WallCalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="4" y="4.5" width="16" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="13.3" r="1" fill="currentColor" />
      <circle cx="12" cy="13.3" r="1" fill="currentColor" />
      <circle cx="16" cy="13.3" r="1" fill="currentColor" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

/** Entonnoir — filtrer/trier. */
export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M3.5 5h17L14 13v6l-4 2v-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Post-it — ajouter une tâche à la main. */
export function StickyNoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 4.5h16v10.5l-5.5 5H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.5 20v-5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 8.5h9M7.5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Fenêtre — un espace encore vide. */
export function WindowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="3" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 11h16M12 3v16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 21.5h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Enveloppe fermée — notification non lue / marquer comme lu. */
export function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 6.5 12 13l8-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Enveloppe ouverte — notification lue / marquer comme non lu. */
export function MailOpenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 10.5 12 4l9 6.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M3 10.7 9.5 15h5l6.5-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Engrenage — la salle technique du site (admin plateforme). */
export function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8 6.2 6.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Combiné téléphonique — la section Chat. */
export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4.5 4.5c0-1 .7-1.5 1.5-1.5h2c.5 0 1 .3 1.2.8l1 2.4c.2.5 0 1.1-.4 1.4l-1.3 1.1a12.3 12.3 0 0 0 5.8 5.8l1.1-1.3c.4-.4 1-.6 1.4-.4l2.4 1c.5.2.8.7.8 1.2v2c0 .8-.5 1.5-1.5 1.5C10.5 20.5 3.5 13.5 4.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lampe de bureau articulée — Platform admin. */
export function DeskLampIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 21h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 21v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="8" cy="17" rx="3.5" ry="1" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 16 12.3 8.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12.3" cy="8.7" r="1.1" fill="currentColor" />
      <path d="M12.3 8.7 15.3 3.7 20.3 6.7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Porte-dossier — Notifications. */
export function FolderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.2h8.5A1.5 1.5 0 0 1 21 8.7v9.8A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trombone — joindre un fichier au message. */
export function PaperclipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M17.5 8.5 9.6 16.4a3 3 0 0 1-4.2-4.2l8.4-8.4a2 2 0 0 1 2.8 2.8l-8 8a1 1 0 0 1-1.4-1.4l7.1-7.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Flèche vers un plateau — télécharger une pièce jointe. */
export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 3.5v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 10.5 12 15l4.5-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Visage souriant en trait — déclenche le sélecteur d'émojis du composeur de chat. */
export function SmileyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 13.5c1 1.4 2.3 2.1 4 2.1s3-.7 4-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}

/** Chevron plein — indicateur d'accordéon (remplace le triangle Unicode "▶", qui se rend en style emoji sur mobile). */
export function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M9 6l7 6-7 6z" fill="currentColor" />
    </svg>
  );
}

/** "i" d'information — ouvre le détail complet d'une tâche. */
export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

/** Coche dans un cercle — confirmation (toasts de succès). */
export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.3l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Triangle d'alerte — toasts d'avertissement. */
export function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 4.2l9 15.6H3l9-15.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.7" r="1" fill="currentColor" />
    </svg>
  );
}

/** Croix dans un cercle — toasts d'erreur. */
export function XCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
