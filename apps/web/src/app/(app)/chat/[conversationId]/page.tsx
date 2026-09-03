'use client';

import { ListSkeleton } from '@/components/ui/skeleton';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Chat } from '@/components/chat/chat';
import { DirectConversationsList } from '@/components/chat/direct-conversations-list';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { listDirectConversations, listDirectMessages, sendDirectFile, type DirectConversation } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DirectConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DirectConversation[] | null>(null);

  useEffect(() => {
    let active = true;
    function load() {
      listDirectConversations().then((list) => {
        if (active) setConversations(list);
      });
    }
    load();
    // Une nouvelle conversation démarrée ailleurs, ou un nouveau message reçu dans une
    // autre discussion, doit apparaître dans la barre latérale sans recharger la page.
    const interval = setInterval(load, 20_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId]);

  const conversation = conversations?.find((c) => c.id === conversationId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Chat', href: '/chat' },
          { label: conversation?.otherUser.nom ?? '…' },
        ]}
      />
      <div className="flex gap-6">
        {/* Toujours montée (même pendant le chargement) pour que la fenêtre de chat ne
            change jamais de largeur — seul son contenu interne bascule en Loading. */}
        <Card className="hidden w-72 shrink-0 overflow-hidden !p-0 lg:block lg:h-fit">
          {conversations === null ? (
            <div className="p-4">
              <ListSkeleton rows={4} />
            </div>
          ) : (
            <DirectConversationsList
              conversations={conversations}
              activeId={conversationId}
              currentUserId={user?.id}
            />
          )}
        </Card>
        <div className="min-w-0 flex-1">
          <Chat
            key={conversationId}
            roomId={conversationId}
            roomKey="conversationId"
            joinEvent="dm:join"
            leaveEvent="dm:leave"
            messageEvent="dm:message"
            fetchHistory={listDirectMessages}
            uploadFile={sendDirectFile}
            title={conversation?.otherUser.nom ?? 'Conversation'}
            description="Direct message."
            otherLastReadAt={conversation?.otherLastReadAt ?? null}
          />
        </div>
      </div>
    </div>
  );
}
