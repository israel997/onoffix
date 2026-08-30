'use client';

import { useEffect, useRef } from 'react';
import { getMyTasks } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

const CHECK_INTERVAL_MS = 30_000;
// Buckets 1-3 = quarts du temps imparti (25/50/75%), 4 = temps dépassé (>=100%).
const QUARTER_BUCKETS = 4;

function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Composant invisible : surveille les tâches en cours de l'utilisateur et alerte à
 * chaque quart du temps imparti, puis en rouge une fois ce temps dépassé. */
export function TaskTimeWatcher() {
  const { user } = useAuth();
  const toast = useToast();
  const notifiedRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function check() {
      const taches = await getMyTasks();
      if (!active) return;

      for (const t of taches) {
        if (t.statut !== 'EN_COURS' || !t.dureeEstimeeMinutes || !t.dateDebut) continue;

        const elapsedMs = Date.now() - new Date(t.dateDebut).getTime();
        const estimatedMs = t.dureeEstimeeMinutes * 60_000;
        const ratio = elapsedMs / estimatedMs;
        const bucket = Math.min(QUARTER_BUCKETS, Math.floor(ratio / 0.25));
        if (bucket < 1) continue;

        const lastNotified = notifiedRef.current.get(t.id) ?? 0;
        if (bucket <= lastNotified) continue;
        notifiedRef.current.set(t.id, bucket);

        if (bucket >= QUARTER_BUCKETS) {
          toast(
            `You have exceeded the time for "${t.titre}" by ${formatDuration(elapsedMs - estimatedMs)}.`,
            'error',
            { persistent: true },
          );
        } else {
          toast(
            `You have done ${formatDuration(elapsedMs)} on "${t.titre}". It remains ${formatDuration(estimatedMs - elapsedMs)}.`,
            'warning',
            { persistent: true },
          );
        }
      }

      // Une tâche qui n'est plus EN_COURS n'a plus besoin d'être suivie.
      const stillRunning = new Set(taches.filter((t) => t.statut === 'EN_COURS').map((t) => t.id));
      for (const id of notifiedRef.current.keys()) {
        if (!stillRunning.has(id)) notifiedRef.current.delete(id);
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return null;
}
