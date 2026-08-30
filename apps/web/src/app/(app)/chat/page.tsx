'use client';

import { Loading } from '@/components/ui/loading';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PersonPlusIcon } from '@/components/icons/office-icons';
import { Avatar, DirectConversationsList } from '@/components/chat/direct-conversations-list';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listDirectConversations,
  listOrganisationMembres,
  startDirectConversation,
  type DirectConversation,
  type OrganisationMembre,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

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
            <EmptyState>No other member in your organisation yet.</EmptyState>
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
          <EmptyState>No conversation yet - start one above.</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <DirectConversationsList conversations={conversations} currentUserId={user?.id} />
        </Card>
      )}
    </div>
  );
}
