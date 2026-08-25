'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { getMembreStats, type MembreStats } from '@/lib/api';

export function MembreStatsModal({
  userId,
  nom,
  onClose,
}: {
  userId: string;
  nom: string;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<MembreStats | null>(null);

  useEffect(() => {
    getMembreStats(userId).then(setStats);
  }, [userId]);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">{nom}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          ✕
        </button>
      </div>

      {!stats ? (
        <Loading className="mt-4 text-sm" />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <span className="text-muted-foreground">Tasks assigned</span>
          <span className="font-semibold text-foreground">{stats.tachesAssignees}</span>
          <span className="text-muted-foreground">Validated</span>
          <span className="font-semibold text-foreground">{stats.tachesValidees}</span>
          <span className="text-muted-foreground">Needs rework</span>
          <span className="font-semibold text-foreground">{stats.tachesARevoir}</span>
          <span className="text-muted-foreground">Hours worked</span>
          <span className="font-semibold text-foreground">{stats.heuresTravaillees}h</span>
          <span className="text-muted-foreground">On-time declarations</span>
          <span className="font-semibold text-foreground">
            {stats.tauxDeclarationsATemps === null ? '—' : `${stats.tauxDeclarationsATemps}%`}
          </span>
          <span className="text-muted-foreground">Blockers encountered</span>
          <span className="font-semibold text-foreground">{stats.blocagesRencontres}</span>
          <span className="text-muted-foreground">Deadlines met</span>
          <span className="font-semibold text-foreground">
            {stats.respectDeadlines === null ? '—' : `${stats.respectDeadlines}%`}
          </span>
        </div>
      )}
    </Modal>
  );
}
