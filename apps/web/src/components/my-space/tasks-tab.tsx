'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useState } from 'react';
import { ChevronIcon } from '@/components/icons/office-icons';
import { TaskItem } from '@/components/tasks/task-item';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getMyTasks, type MyTache } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Group {
  key: string;
  nom: string;
  taches: MyTache[];
}

function groupByOffice(taches: MyTache[]): Group[] {
  const groups = new Map<string, Group>();
  for (const t of taches) {
    const key = t.projet.bureau?.id ?? 'personal';
    const nom = t.projet.bureau?.nom ?? 'Personal';
    if (!groups.has(key)) groups.set(key, { key, nom, taches: [] });
    groups.get(key)!.taches.push(t);
  }
  // Une tâche cochée (validée) descend en bas de sa liste plutôt que de rester à sa place.
  for (const group of groups.values()) {
    group.taches.sort((a, b) => Number(a.statut === 'VALIDE') - Number(b.statut === 'VALIDE'));
  }
  return Array.from(groups.values());
}

/**
 * `scope="personal"` ne garde que les tâches de l'Organizer personnel (sans bureau) —
 * les tâches des offices sont déjà visibles ailleurs (Dashboard, Daily check-in).
 * `scope="all"` (par défaut) garde le comportement historique : tout, partout.
 */
export function TasksTab({ scope = 'all' }: { scope?: 'all' | 'personal' }) {
  const { user } = useAuth();
  const [taches, setTaches] = useState<MyTache[] | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  async function load() {
    setTaches(await getMyTasks());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (taches === null) return <Loading className="text-sm" />;

  const scoped = scope === 'personal' ? taches.filter((t) => t.projet.bureau === null) : taches;

  if (scoped.length === 0) {
    return (
      <Card>
        <EmptyState>Nothing assigned to you yet.</EmptyState>
      </Card>
    );
  }

  const groups = groupByOffice(scoped);

  return (
    <div className="flex flex-col gap-4">
      {user &&
        groups.map((g) => {
          const open = openGroups.has(g.key);
          return (
            <Card key={g.key}>
              <button
                onClick={() => toggleGroup(g.key)}
                className="flex w-full items-center gap-2 text-left"
              >
                <ChevronIcon
                  className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
                />
                <h2 className="text-sm font-semibold text-foreground">
                  {g.nom} ({g.taches.length})
                </h2>
              </button>
              {open && (
                <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {g.taches.map((t) => (
                    <TaskItem
                      key={t.id}
                      tache={t}
                      currentUserId={user.id}
                      // Une tâche personnelle (hors bureau) est intégralement gérée par son
                      // propriétaire — sinon impossible d'éditer/prioriser ce qu'on a soi-même créé.
                      isManager={t.projet.bureau === null || user.roleGlobal === 'ADMIN'}
                      isAdmin={user.roleGlobal === 'ADMIN'}
                      isPersonal={t.projet.bureau === null}
                      assignableMembres={[]}
                      onChange={load}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
    </div>
  );
}
