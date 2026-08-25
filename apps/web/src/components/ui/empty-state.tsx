import type { ReactNode } from 'react';
import { WindowIcon } from '@/components/icons/office-icons';
import { CardDescription } from '@/components/ui/card';

/** Rien à afficher pour l'instant — comme regarder par une fenêtre dans une pièce encore vide. */
export function EmptyState({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 py-2 text-center ${className}`}>
      <WindowIcon className="h-6 w-6 text-muted-foreground/40" />
      <CardDescription>{children}</CardDescription>
    </div>
  );
}
