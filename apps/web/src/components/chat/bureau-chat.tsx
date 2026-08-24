'use client';

import { listMessages, sendBureauFile } from '@/lib/api';
import { Chat } from './chat';

export function BureauChat({
  bureauId,
  mentionableUsers,
}: {
  bureauId: string;
  mentionableUsers?: { id: string; nom: string }[];
}) {
  return (
    <Chat
      roomId={bureauId}
      roomKey="bureauId"
      joinEvent="bureau:join"
      leaveEvent="bureau:leave"
      messageEvent="bureau:message"
      fetchHistory={listMessages}
      uploadFile={sendBureauFile}
      title="Team chat"
      description="Real-time discussion for this office."
      mentionableUsers={mentionableUsers}
    />
  );
}
