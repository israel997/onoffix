'use client';

import { Loading } from '@/components/ui/loading';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PersonPlusIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import {
  listDirectConversations,
  listOrganisationMembres,
  resolveAssetUrl,
  startDirectConversation,
  type DirectConversation,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ nom, photoUrl }: { nom: string; photoUrl: string | null }) {
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

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ChatListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DirectConversation[] | null>(null);
  const [members, setMembers] = useState<OrganisationMembre[] | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  async function load() {
    setConversations(await listDirectConversations());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function openPicker() {
    setShowPicker((v) => !v);
    if (!members) setMembers(await listOrganisationMembres());
  }

  async function handleStart(otherUserId: string) {
    setStarting(otherUserId);
    try {
      const conversation = await startDirectConversation(otherUserId);
      router.push(`/chat/${conversation.id}`);
    } finally {
      setStarting(null);
    }
  }

  const existingOtherIds = new Set(conversations?.map((c) => c.otherUser.id));
  const pickable = members?.filter((m) => m.id !== user?.id) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Chat' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your one-on-one conversations.</p>
        </div>
        <Button onClick={openPicker} aria-label={showPicker ? 'Cancel' : 'New message'} title={showPicker ? 'Cancel' : 'New message'}>
          {showPicker ? '✕' : <PersonPlusIcon className="h-5 w-5" />}
        </Button>
      </div>

      {showPicker && (
        <Card>
          <p className="mb-3 text-sm font-medium text-foreground">Start a conversation with…</p>
          {!members ? (
            <Loading className="text-sm" />
          ) : pickable.length === 0 ? (
            <CardDescription>No other member in your organisation yet.</CardDescription>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {pickable.map((m) => (
                <button
                  key={m.id}
                  disabled={starting === m.id}
                  onClick={() => handleStart(m.id)}
                  className="flex items-center gap-3 py-2.5 text-left hover:bg-surface-muted"
                >
                  <Avatar nom={m.nom} photoUrl={m.photoUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.nom}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  {existingOtherIds.has(m.id) && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">Open existing →</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {conversations === null ? (
        <Loading className="text-sm" />
      ) : conversations.length === 0 ? (
        <Card>
          <CardDescription>No conversation yet — start one above.</CardDescription>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col divide-y divide-border">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/chat/${c.id}`)}
                className="flex items-center gap-3 py-3 text-left hover:bg-surface-muted"
              >
                <Avatar nom={c.otherUser.nom} photoUrl={c.otherUser.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.otherUser.nom}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lastMessage
                      ? `${c.lastMessage.auteurId === user?.id ? 'You: ' : ''}${c.lastMessage.contenu ?? (c.lastMessage.fichierNom ? `📎 ${c.lastMessage.fichierNom}` : '')}`
                      : 'No messages yet'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(c.lastActivity)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
