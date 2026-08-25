'use client';

import { MeetingRoomIcon } from '@/components/icons/office-icons';
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
      title={
        <span className="flex items-center gap-2">
          <MeetingRoomIcon className="h-5 w-5 text-brand-blue" />
          Team chat
        </span>
      }
      description="Real-time discussion for this office."
      mentionableUsers={mentionableUsers}
    />
  );
}
