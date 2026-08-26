'use client';

import { Loading } from '@/components/ui/loading';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  creerBlocage,
  getChronoStatut,
  listBlocages,
  resoudreBlocage,
  type ChronoStatut,
  type Tache,
  type TacheBlocage,
  type TypeBlocage,
} from '@/lib/api';
import { useToast } from '@/lib/toast-context';

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

const BLOCAGE_TYPES: TypeBlocage[] = ['TACHE', 'PERSONNE', 'DECISION', 'CLIENT', 'RESSOURCE', 'EXTERNE'];

export function TaskDetailModal({
  tache,
  isManager,
  currentUserId,
  onClose,
  onChange,
}: {
  tache: Tache;
  isManager: boolean;
  currentUserId: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const canReportBlocker = isManager || tache.assigneAId === currentUserId;
  const [blocages, setBlocages] = useState<TacheBlocage[] | null>(null);
  const [chrono, setChrono] = useState<ChronoStatut | null>(null);
  const [newCause, setNewCause] = useState('');
  const [newType, setNewType] = useState<TypeBlocage>('TACHE');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function load() {
    const [b, c] = await Promise.all([listBlocages(tache.id), getChronoStatut(tache.id)]);
    setBlocages(b);
    setChrono(c);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tache.id]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
      onChange();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">{tache.titre}</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          ✕
        </button>
      </div>
      {tache.description && <p className="mt-2 text-sm text-muted-foreground">{tache.description}</p>}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground">Status</span>
        <span className="text-foreground">{tache.statut}</span>
        <span className="text-muted-foreground">Health</span>
        <span className="text-foreground">{tache.sante}</span>
        <span className="text-muted-foreground">Priority</span>
        <span className="text-foreground">{tache.priorite}</span>
        <span className="text-muted-foreground">Assigned to</span>
        <span className="text-foreground">{tache.assigneA?.nom ?? 'Unassigned'}</span>
        <span className="text-muted-foreground">Created</span>
        <span className="text-foreground">{formatDate(tache.createdAt)}</span>
        <span className="text-muted-foreground">Started</span>
        <span className="text-foreground">{formatDate(tache.dateDebut)}</span>
        <span className="text-muted-foreground">Declared done</span>
        <span className="text-foreground">{formatDate(tache.dateDeclaration)}</span>
        <span className="text-muted-foreground">Validated</span>
        <span className="text-foreground">{formatDate(tache.dateValidation)}</span>
        <span className="text-muted-foreground">Due</span>
        <span className="text-foreground">{formatDate(tache.dateEcheance)}</span>
        {tache.conversation && (
          <>
            <span className="text-muted-foreground">Subject</span>
            <span className="text-foreground">{tache.conversation.nom}</span>
          </>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">Time tracking</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {chrono ? formatMinutes(chrono.dureeReelleMinutes) : '-'} logged
          {tache.dureeEstimeeMinutes ? ` / ${formatMinutes(tache.dureeEstimeeMinutes)} estimated` : ''}
          {chrono?.enCours && ' · running now'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tracked automatically: it starts when the task is started and stops once marked as done.
        </p>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">Blockers</p>
        <div className="mt-2 flex flex-col gap-2">
          {blocages === null ? (
            <Loading className="text-xs" />
          ) : blocages.length === 0 ? (
            <p className="text-xs text-muted-foreground">None.</p>
          ) : (
            blocages.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs">
                <div>
                  <Badge tone={b.dateFin ? 'validated' : 'review'}>{b.type}</Badge>
                  {b.cause && <span className="ml-2 text-muted-foreground">{b.cause}</span>}
                </div>
                {!b.dateFin && isManager && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => resoudreBlocage(tache.id, b.id))}>
                    Resolve
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
        {canReportBlocker && (
          <div className="mt-3 flex items-center gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as TypeBlocage)}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
            >
              {BLOCAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={newCause}
              onChange={(e) => setNewCause(e.target.value)}
              placeholder="Cause…"
              className="h-8 flex-1 rounded-lg border border-border bg-surface px-2 text-xs"
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                run(() => creerBlocage(tache.id, { type: newType, cause: newCause || undefined })).then(() =>
                  setNewCause(''),
                )
              }
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
