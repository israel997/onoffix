'use client';

import { MeetingRoomIcon } from '@/components/icons/office-icons';
import { listMessages, sendBureauFile, type CouleurBureau } from '@/lib/api';
import { BUREAU_COLORS } from '@/lib/bureau-colors';
import { Chat } from './chat';

export function BureauChat({
  bureauId,
  mentionableUsers,
  couleur,
}: {
  bureauId: string;
  mentionableUsers?: { id: string; nom: string }[];
  couleur?: CouleurBureau;
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
      accentColor={couleur ? { bubble: BUREAU_COLORS[couleur].bubble, bubbleDark: BUREAU_COLORS[couleur].bubbleDark } : undefined}
    />
  );
}
