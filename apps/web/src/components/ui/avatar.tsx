import { resolveAssetUrl } from '@/lib/api';
import { cn } from '@/lib/cn';

function initials(nom: string) {
  return nom
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-sm',
} as const;

const TONE_CLASSES = {
  navy: 'bg-brand-navy text-white',
  indigo: 'bg-indigo-100 text-indigo-700',
  muted: 'bg-surface-muted text-muted-foreground',
} as const;

/** Photo si dispo, sinon initiales dans une pastille — même composant partout (Chat, Members, tâches). */
export function Avatar({
  nom,
  photoUrl,
  size = 'md',
  tone = 'navy',
  className,
}: {
  nom: string;
  photoUrl: string | null;
  size?: keyof typeof SIZE_CLASSES;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}) {
  const src = resolveAssetUrl(photoUrl);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={nom} className={cn('shrink-0 rounded-full object-cover', SIZE_CLASSES[size], className)} />;
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
    >
      {initials(nom)}
    </span>
  );
}
