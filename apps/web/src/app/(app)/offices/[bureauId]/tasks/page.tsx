'use client';

import { Loading } from '@/components/ui/loading';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ChevronIcon, FilterIcon } from '@/components/icons/office-icons';
import { OfficeNav } from '@/components/offices/office-nav';
import { TaskItem } from '@/components/tasks/task-item';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createOrganizerSubject,
  getBureau,
  getBureauOrganizer,
  listBureauTaches,
  updateTache,
  type BureauDetail,
  type OrganizerDetail,
  type StatutTache,
  type Tache,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

interface Group {
  conversationId: string | null;
  nom: string;
  taches: Tache[];
}

function groupBySubject(taches: Tache[]): Group[] {
  const groups = new Map<string, Group>();
  for (const t of taches) {
    const key = t.conversation?.id ?? 'none';
    const nom = t.conversation?.nom ?? 'No subject';
    if (!groups.has(key)) groups.set(key, { conversationId: t.conversation?.id ?? null, nom, taches: [] });
    groups.get(key)!.taches.push(t);
  }
  return Array.from(groups.values());
}

function breakdown(taches: Tache[]) {
  const termine = taches.filter((t) => t.statut === 'VALIDE').length;
  const nonCommence = taches.filter((t) => t.statut === 'A_FAIRE').length;
  const enCours = taches.length - termine - nonCommence;
  return { termine, enCours, nonCommence };
}

type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'UNASSIGNED' | 'DECLARE' | 'VALIDE' | 'BLOCKED';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
  { value: 'DECLARE', label: 'Waiting for validation' },
  { value: 'VALIDE', label: 'Done' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const IN_PROGRESS_STATUSES: StatutTache[] = ['ACCEPTEE', 'EN_COURS', 'A_REVOIR'];

function applyFilter(taches: Tache[], filter: StatusFilter) {
  switch (filter) {
    case 'IN_PROGRESS':
      return taches.filter((t) => IN_PROGRESS_STATUSES.includes(t.statut));
    case 'UNASSIGNED':
      return taches.filter((t) => !t.assigneAId);
    case 'DECLARE':
      return taches.filter((t) => t.statut === 'DECLARE');
    case 'VALIDE':
      return taches.filter((t) => t.statut === 'VALIDE');
    case 'BLOCKED':
      return taches.filter((t) => t.sante === 'BLOQUEE');
    default:
      return taches;
  }
}

function isStatusFilter(value: string | null): value is StatusFilter {
  return !!value && STATUS_FILTERS.some((f) => f.value === value);
}

function TasksPageContent() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);
  const initialStatus = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    isStatusFilter(initialStatus) ? initialStatus : 'ALL',
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  async function load() {
    const [t, bur, org] = await Promise.all([
      listBureauTaches(bureauId),
      getBureau(bureauId),
      getBureauOrganizer(bureauId),
    ]);
    setTaches(t);
    setBureau(bur);
    setOrganizer(org);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Un collaborateur qui accepte/démarre/déclare une tâche ailleurs ne déclenche rien
    // ici — on repasse périodiquement pour refléter les changements sans obliger à
    // recharger la page manuellement.
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  // "No subject" n'est pas une vraie catégorie en base — juste l'étiquette affichée
  // pour les tâches sans conversationId. La "renommer" crée une vraie catégorie et
  // y déplace ces tâches, pour qu'elle devienne renommable/gérable comme les autres.
  async function handleRenameNoSubject(g: Group) {
    if (!organizer) return;
    const nom = window.prompt('Name this subject', '')?.trim();
    if (!nom) return;
    try {
      const subject = await createOrganizerSubject(organizer.id, nom);
      await Promise.all(g.taches.map((t) => updateTache(t.id, { conversationId: subject.id })));
      await load();
      toast('Subject created');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isManager =
    isAdmin || bureau?.membres.some((m) => m.user.id === user?.id && m.roleDansBureau === 'MANAGER') || false;

  if (!taches || !bureau || !organizer) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-32" />
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-40" />
            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const filtered = applyFilter(taches, statusFilter);
  const groups = groupBySubject(filtered);
  // Toutes les subjects du projet, pas seulement celles qui ont déjà une tâche —
  // sinon impossible de déplacer une tâche vers une subject encore vide.
  const moveTargets = [
    { conversationId: null as string | null, nom: 'No subject' },
    ...organizer.conversations.map((c) => ({ conversationId: c.id as string | null, nom: c.nom })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Tasks' },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">{taches.length} task(s) in this office.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      {taches.length === 0 ? (
        <Card>
          <EmptyState>Nothing yet.</EmptyState>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState>No task matches this filter.</EmptyState>
        </Card>
      ) : (
        groups.map((g) => {
          const key = g.conversationId ?? 'none';
          const { termine, enCours, nonCommence } = breakdown(g.taches);
          const open = openGroups.has(key);
          return (
            <Card key={key} id={`subject-${g.nom}`}>
              <button
                onClick={() => toggleGroup(key)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <ChevronIcon
                    className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
                  />
                  <h2 className="text-sm font-semibold text-foreground">
                    {g.nom} ({g.taches.length} task{g.taches.length > 1 ? 's' : ''})
                  </h2>
                  {isManager && g.conversationId === null && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameNoSubject(g);
                      }}
                      aria-label="Name this subject"
                      title="Name this subject"
                      className="rounded px-1 text-muted-foreground hover:text-foreground"
                    >
                      ✎
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enCours} in progress · {termine} done · {nonCommence} not started
                </p>
              </button>
              {open && (
                <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {user &&
                    // Les tâches validées descendent en bas de liste.
                    [...g.taches]
                      .sort((a, b) => Number(a.statut === 'VALIDE') - Number(b.statut === 'VALIDE'))
                      .map((t) => (
                      <TaskItem
                        key={t.id}
                        tache={t}
                        currentUserId={user.id}
                        isManager={isManager}
                        isAdmin={isAdmin}
                        assignableMembres={bureau.membres}
                        moveTargets={moveTargets.filter((m) => m.conversationId !== g.conversationId)}
                        onChange={load}
                      />
                    ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<Loading className="text-sm" />}>
      <TasksPageContent />
    </Suspense>
  );
}
