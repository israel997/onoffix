'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Chat } from '@/components/chat/chat';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { listDirectConversations, listDirectMessages, sendDirectFile, type DirectConversation } from '@/lib/api';

export default function DirectConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const [conversation, setConversation] = useState<DirectConversation | null>(null);

  useEffect(() => {
    let active = true;
    listDirectConversations().then((list) => {
      if (active) setConversation(list.find((c) => c.id === conversationId) ?? null);
    });
    return () => {
      active = false;
    };
  }, [conversationId]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Chat', href: '/chat' },
          { label: conversation?.otherUser.nom ?? '…' },
        ]}
      />
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
      />
    </div>
  );
}
