'use client';

import { ListSkeleton } from '@/components/ui/skeleton';

import { useEffect, useMemo, useState } from 'react';
import { TaskCalendarModal } from '@/components/calendar/task-calendar-modal';
import { AlarmIcon } from '@/components/icons/office-icons';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  deleteTache,
  getMyOrganizer,
  getMyTasks,
  getOrganisationTasks,
  type MyTache,
  type PrioriteTache,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/lib/confirm-context';
import { useToast } from '@/lib/toast-context';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABEL = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

const PRIORITE_BADGE_TONE: Record<PrioriteTache, 'neutral' | 'declared' | 'review'> = {
  BASSE: 'neutral',
  NORMALE: 'neutral',
  HAUTE: 'declared',
  URGENTE: 'review',
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateKeyFromIso(iso: string) {
  return dateKey(new Date(iso));
}

function timeFromIso(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildWeeks(monthStart: Date): Date[][] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(year, month, 1 - startWeekday);
  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const isAdmin = user?.roleGlobal === 'ADMIN';

  const [scope, setScope] = useState<'mine' | 'organisation'>('mine');
  const [tasks, setTasks] = useState<MyTache[] | null>(null);
  const [personalOrganizerId, setPersonalOrganizerId] = useState<string | null>(null);
  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [modalState, setModalState] = useState<{ task?: MyTache } | null>(null);

  async function load() {
    const [t, organizer] = await Promise.all([
      scope === 'organisation' ? getOrganisationTasks() : getMyTasks(),
      getMyOrganizer(),
    ]);
    setTasks(t);
    setPersonalOrganizerId(organizer.id);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  // Un jour peut avoir des tâches qui lui sont attribuées (dateCible) et/ou des tâches
  // dont l'échéance tombe ce jour-là (dateEcheance) — les deux sont affichées, distinguées
  // par une pastille verte (attribuée) / rouge (échéance).
  const tasksByDay = useMemo(() => {
    const map = new Map<string, { assigned: MyTache[]; due: MyTache[] }>();
    function bucket(key: string) {
      if (!map.has(key)) map.set(key, { assigned: [], due: [] });
      return map.get(key)!;
    }
    for (const t of tasks ?? []) {
      if (t.dateCible) bucket(dateKeyFromIso(t.dateCible)).assigned.push(t);
      if (t.dateEcheance) bucket(dateKeyFromIso(t.dateEcheance)).due.push(t);
    }
    return map;
  }, [tasks]);

  const upcoming = useMemo(() => {
    const todayKey = dateKey(new Date());
    const entries: { task: MyTache; date: string; kind: 'assigned' | 'due' }[] = [];
    for (const t of tasks ?? []) {
      if (t.dateCible && dateKeyFromIso(t.dateCible) >= todayKey) {
        entries.push({ task: t, date: t.dateCible, kind: 'assigned' });
      }
      if (t.dateEcheance && dateKeyFromIso(t.dateEcheance) >= todayKey) {
        entries.push({ task: t, date: t.dateEcheance, kind: 'due' });
      }
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  }, [tasks]);

  function jumpToDate(key: string) {
    const [y, m] = key.split('-').map(Number);
    setMonthStart(new Date(y, m - 1, 1));
    setSelectedDate(key);
  }

  async function handleDelete(task: MyTache) {
    const ok = await confirmDialog({
      title: `Delete "${task.titre}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTache(task.id);
      toast('Task deleted');
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  const weeks = buildWeeks(monthStart);
  const todayKey = dateKey(new Date());
  const selectedDay = tasksByDay.get(selectedDate);
  const selectedAssigned = selectedDay?.assigned ?? [];
  const selectedDue = selectedDay?.due ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your tasks by assigned date (<span className="text-green-600">green</span>) and due date (
            <span className="text-status-review">red</span>), at a glance.
          </p>
        </div>
        {isAdmin && (
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'mine' | 'organisation')}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="mine">My tasks</option>
            <option value="organisation">Whole organisation</option>
          </select>
        )}
      </div>

      {tasks === null ? (
        <Card>
          <ListSkeleton rows={4} />
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  ←
                </Button>
                <p className="text-sm font-semibold text-foreground">{MONTH_LABEL.format(monthStart)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  →
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((day) => {
                  const key = dateKey(day);
                  const inMonth = day.getMonth() === monthStart.getMonth();
                  const dayData = tasksByDay.get(key);
                  const hasAssigned = !!dayData?.assigned.length;
                  const hasDue = !!dayData?.due.length;
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDate;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                        isSelected
                          ? 'border-brand-blue bg-brand-blue-light'
                          : isToday
                            ? 'border-brand-blue/40 bg-surface-muted'
                            : 'border-border bg-surface hover:bg-surface-muted'
                      } ${inMonth ? '' : 'opacity-40'}`}
                    >
                      <span className={`text-xs font-semibold ${isToday ? 'text-brand-blue' : 'text-foreground'}`}>
                        {day.getDate()}
                      </span>
                      {(hasAssigned || hasDue) && (
                        <div className="flex gap-0.5">
                          {hasAssigned && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                          {hasDue && <span className="h-1.5 w-1.5 rounded-full bg-status-review" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>{selectedDate}</CardTitle>
                <Button size="sm" onClick={() => setModalState({})}>
                  + Add
                </Button>
              </div>

              {selectedAssigned.length === 0 && selectedDue.length === 0 ? (
                <CardDescription>Nothing scheduled this day.</CardDescription>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedAssigned.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-green-600">Assigned</p>
                      {selectedAssigned.map((t) => (
                        <div key={t.id} className="rounded-lg border border-border p-2.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-foreground">{t.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {t.assigneA?.nom ?? 'Unassigned'} · {t.projet.bureau?.nom ?? 'Personal'}
                              </p>
                            </div>
                            <Badge tone={PRIORITE_BADGE_TONE[t.priorite]}>{t.priorite}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedDue.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-status-review">Due</p>
                      {selectedDue.map((t) => (
                        <div key={t.id} className="rounded-lg border border-border p-2.5 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-foreground">{t.titre}</p>
                              <p className="text-xs text-muted-foreground">
                                {timeFromIso(t.dateEcheance!)} · {t.assigneA?.nom ?? 'Unassigned'} ·{' '}
                                {t.projet.bureau?.nom ?? 'Personal'}
                              </p>
                              {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                            </div>
                            <Badge tone={PRIORITE_BADGE_TONE[t.priorite]}>{t.priorite}</Badge>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => setModalState({ task: t })}
                              aria-label="Edit"
                              className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              aria-label="Delete"
                              className="rounded px-1 text-xs text-muted-foreground hover:text-status-review"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <Card>
            <CardTitle className="flex items-center gap-2">
              <AlarmIcon className="h-5 w-5 text-brand-blue" />
              Upcoming
            </CardTitle>
            {upcoming.length === 0 ? (
              <CardDescription className="mt-2">Nothing coming up.</CardDescription>
            ) : (
              <div className="mt-3 flex flex-col divide-y divide-border">
                {upcoming.map(({ task: t, date, kind }) => (
                  <button
                    key={`${kind}-${t.id}`}
                    onClick={() => jumpToDate(dateKeyFromIso(date))}
                    className="flex items-center justify-between gap-2 py-2.5 text-left text-sm hover:bg-surface-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${kind === 'assigned' ? 'bg-green-500' : 'bg-status-review'}`} />
                      <span className="font-medium text-foreground">{t.titre}</span>
                      <span className="text-xs text-muted-foreground">
                        {kind === 'assigned' ? 'Assigned' : 'Due'} · {t.assigneA?.nom ?? 'Unassigned'} ·{' '}
                        {t.projet.bureau?.nom ?? 'Personal'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dateKeyFromIso(date)}
                      {kind === 'due' ? ` ${timeFromIso(date)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {modalState && (
        <TaskCalendarModal
          task={modalState.task}
          defaultDate={selectedDate}
          personalOrganizerId={personalOrganizerId}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            load();
          }}
        />
      )}
    </div>
  );
}
