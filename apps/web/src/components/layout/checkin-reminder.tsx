'use client';

import { useEffect, useState } from 'react';
import { AlarmIcon } from '@/components/icons/office-icons';
import { Button } from '@/components/ui/button';
import { getAujourdhui, listBureaux } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// Fenêtre avant l'heure de déclaration pendant laquelle l'horloge peut apparaître.
const WARNING_WINDOW_MINUTES = 30;
const CHECK_INTERVAL_MS = 30_000;
const DISMISSED_KEY_PREFIX = 'ooffix_checkin_reminder_dismissed_';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Secondes avant heureDeclaration (HH:mm) aujourd'hui, dans le fuseau du bureau — négatif si déjà passée. */
function secondsUntil(heureDeclaration: string, fuseauHoraire: string): number {
  const [h, m] = heureDeclaration.split(':').map(Number);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseauHoraire,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const nowSeconds = get('hour') * 3600 + get('minute') * 60 + get('second');
  return h * 3600 + m * 60 - nowSeconds;
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

export function CheckinReminder() {
  const { user } = useAuth();
  const [targetTimestamp, setTargetTimestamp] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const currentUser = user;
    let active = true;

    async function check() {
      if (localStorage.getItem(DISMISSED_KEY_PREFIX + todayKey())) {
        if (active) setDismissed(true);
        return;
      }
      const [bureaux, aujourdhui] = await Promise.all([listBureaux(), getAujourdhui()]);
      if (!active) return;
      if (aujourdhui.declare) {
        setTargetTimestamp(null);
        return;
      }

      const myBureauIds = new Set(currentUser.bureaux.map((b) => b.bureau.id));
      let earliest: number | null = null;
      for (const b of bureaux) {
        if (!myBureauIds.has(b.id)) continue;
        const seconds = secondsUntil(b.heureDeclaration, b.fuseauHoraire);
        if (seconds > 0 && seconds <= WARNING_WINDOW_MINUTES * 60) {
          const ts = Date.now() + seconds * 1000;
          if (earliest === null || ts < earliest) earliest = ts;
        }
      }
      setTargetTimestamp(earliest);
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    if (targetTimestamp === null) return;
    const tick = () => setSecondsLeft(Math.round((targetTimestamp - Date.now()) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  if (dismissed || targetTimestamp === null || secondsLeft <= 0) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-status-declared px-4 py-2.5 text-sm font-medium text-white">
      <AlarmIcon className="h-4 w-4 shrink-0" />
      <span>
        You must submit your daily check-in in <span className="font-mono font-bold">{formatCountdown(secondsLeft)}</span>
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="!h-7 !bg-white/15 !border-white/30 !text-white hover:!bg-white/25"
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY_PREFIX + todayKey(), '1');
          setDismissed(true);
        }}
      >
        Got it
      </Button>
    </div>
  );
}
