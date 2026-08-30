'use client';

import Link from 'next/link';
import { resolveAssetUrl, type DirectConversation } from '@/lib/api';
import { cn } from '@/lib/cn';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ nom, photoUrl }: { nom: string; photoUrl: string | null }) {
  const src = resolveAssetUrl(photoUrl);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={nom} className="h-10 w-10 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
      {initials(nom)}
    </span>
  );
}

export function formatConversationWhen(iso: string) {
  return new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Liste des conversations 1:1 — réutilisée dans la liste principale et en barre latérale d'un fil ouvert. */
export function DirectConversationsList({
  conversations,
  activeId,
  currentUserId,
}: {
  conversations: DirectConversation[];
  activeId?: string;
  currentUserId?: string;
}) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/chat/${c.id}`}
          className={cn(
            'flex items-center gap-3 py-3 pl-2 pr-3 text-left hover:bg-surface-muted',
            c.id === activeId && 'bg-brand-blue-light',
          )}
        >
          <Avatar nom={c.otherUser.nom} photoUrl={c.otherUser.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm text-foreground', c.unread ? 'font-semibold' : 'font-medium')}>
              {c.otherUser.nom}
            </p>
            <p className={cn('truncate text-xs', c.unread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {c.lastMessage
                ? `${c.lastMessage.auteurId === currentUserId ? 'You: ' : ''}${c.lastMessage.contenu ?? (c.lastMessage.fichierNom ? `📎 ${c.lastMessage.fichierNom}` : '')}`
                : 'No messages yet'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">{formatConversationWhen(c.lastActivity)}</span>
            {c.unread && <span className="h-2 w-2 rounded-full bg-brand-blue" />}
          </div>
        </Link>
      ))}
    </div>
  );
}
