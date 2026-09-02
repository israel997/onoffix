import { cn } from '@/lib/cn';

/** Bloc gris pulsant — remplace un spinner quand la forme du contenu à venir est connue. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-muted', className)} />;
}
