'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardIcon,
  HeadphonesIcon,
  LaserEyesIcon,
  MountainPeakIcon,
  ReceptionIcon,
} from '@/components/icons/office-icons';
import { cn } from '@/lib/cn';
import type { Bureau } from '@/lib/api';

type NormalMode = 'welcome' | 'focus' | 'results';
type CheckInMode = 'hello' | 'progress' | 'declare';

/** Combien de temps chaque état reste affiché avant de passer au suivant. */
const NORMAL_DURATIONS: Record<NormalMode, number> = { welcome: 5000, focus: 3000, results: 10000 };
const NORMAL_NEXT: Record<NormalMode, NormalMode> = { welcome: 'focus', focus: 'results', results: 'welcome' };

const CHECKIN_SEQUENCE: CheckInMode[] = ['hello', 'progress', 'declare'];
const CHECKIN_DURATION_MS = 10_000;
const CHECKIN_WINDOW_MINUTES = 30;
const CHECKIN_RECHECK_MS = 60_000;

function minutesSinceMidnightInTz(tz: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

function circularDiffMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

/** Vrai dès qu'au moins un des bureaux de la personne est dans sa fenêtre de check-in. */
function isWithinCheckInWindow(bureaux: Bureau[]): boolean {
  return bureaux.some((bureau) => {
    const [h, m] = bureau.heureDeclaration.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const nowMinutes = minutesSinceMidnightInTz(bureau.fuseauHoraire || 'UTC');
    if (nowMinutes === null) return false;
    return circularDiffMinutes(nowMinutes, h * 60 + m) <= CHECKIN_WINDOW_MINUTES;
  });
}

export function DashboardHeading({ name, bureaux }: { name: string; bureaux: Bureau[] }) {
  const [checkInActive, setCheckInActive] = useState(false);
  const [normalMode, setNormalMode] = useState<NormalMode>('welcome');
  const [checkInIndex, setCheckInIndex] = useState(0);

  // La fenêtre de check-in peut s'ouvrir ou se refermer pendant que le Dashboard
  // reste ouvert (heure qui avance) — on la réévalue régulièrement, pas juste au chargement.
  useEffect(() => {
    const evaluate = () => setCheckInActive(isWithinCheckInWindow(bureaux));
    evaluate();
    const id = setInterval(evaluate, CHECKIN_RECHECK_MS);
    return () => clearInterval(id);
  }, [bureaux]);

  useEffect(() => {
    if (checkInActive) return;
    const id = setTimeout(() => setNormalMode((m) => NORMAL_NEXT[m]), NORMAL_DURATIONS[normalMode]);
    return () => clearTimeout(id);
  }, [normalMode, checkInActive]);

  useEffect(() => {
    if (!checkInActive) return;
    const id = setTimeout(() => setCheckInIndex((i) => (i + 1) % CHECKIN_SEQUENCE.length), CHECKIN_DURATION_MS);
    return () => clearTimeout(id);
  }, [checkInIndex, checkInActive]);

  const iconClass = 'h-6 w-6 shrink-0 sm:h-8 sm:w-8';
  const lineClass = 'inline-flex animate-fade-in-up items-start gap-2 sm:gap-3';

  if (checkInActive) {
    const mode = CHECKIN_SEQUENCE[checkInIndex];
    if (mode === 'hello') {
      return (
        <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
          <span key="hello" className={lineClass}>
            <ReceptionIcon className={cn(iconClass, 'text-brand-blue')} />
            Hello, <span className="text-brand-blue">{name}</span>!
          </span>
        </h1>
      );
    }
    if (mode === 'progress') {
      return (
        <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
          <span key="progress" className={lineClass}>
            <ClipboardIcon className={cn(iconClass, 'text-status-declared')} />
            Have you made progress on <span className="text-status-declared">your tasks</span>?
          </span>
        </h1>
      );
    }
    return (
      <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
        <span key="declare" className={lineClass}>
          <LaserEyesIcon className={cn(iconClass, 'text-indigo-600')} />
          Time to <span className="text-indigo-600">declare your day</span>.
        </span>
      </h1>
    );
  }

  if (normalMode === 'welcome') {
    return (
      <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
        <span key="welcome" className={lineClass}>
          <ReceptionIcon className={cn(iconClass, 'text-brand-blue')} />
          Welcome, <span className="text-brand-blue">{name}</span>
        </span>
      </h1>
    );
  }

  // 'focus' et 'results' partagent la même base "Fewer meetings," : le span extérieur
  // garde la clé "meetings" dans les deux cas, donc il ne se réanime jamais entre les
  // deux — seul le span intérieur (le mot qui change) a sa propre clé et s'anime.
  const isFocus = normalMode === 'focus';
  return (
    <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
      <span key="meetings" className={lineClass}>
        {isFocus ? (
          <HeadphonesIcon className={cn(iconClass, 'text-status-review')} />
        ) : (
          <MountainPeakIcon className={cn(iconClass, 'text-indigo-600')} />
        )}
        <span>
          Fewer meetings,{' '}
          <span key={normalMode} className={cn('animate-fade-in-up', isFocus ? 'text-status-review' : 'text-indigo-600')}>
            {isFocus ? 'more focus' : 'more results'}
          </span>
          .
        </span>
      </span>
    </h1>
  );
}
