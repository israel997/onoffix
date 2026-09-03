import { cn } from '@/lib/cn';
import { Card } from './card';

/** Bloc gris pulsant — remplace un spinner quand la forme du contenu à venir est connue. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-muted', className)} />;
}

/** Premier affichage d'une page entière : fil d'ariane + titre + 1-2 cartes vides. */
export function PageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-32" />
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-4 w-40" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Liste de lignes "avatar + texte" en attente — invitations, membres, notifications, conversations… */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-1.5 h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
