'use client';

import { Loading } from '@/components/ui/loading';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronIcon } from '@/components/icons/office-icons';
import { OfficeNav } from '@/components/offices/office-nav';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getBureau,
  getDailyBrief,
  listBureauTaches,
  validerTache,
  type BureauDetail,
  type DailyBrief,
  type Tache,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

function DailyBriefCard({ brief }: { brief: DailyBrief }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Daily Team Brief: {brief.date}</h2>
        {brief.pourcentageRituel !== null && (
          <Badge tone={brief.pourcentageRituel === 100 ? 'validated' : 'brand'}>
            {brief.pourcentageRituel}% of today&apos;s tasks done
          </Badge>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{brief.termine}</span> done
        </span>
        <span>
          <span className="font-semibold text-foreground">{brief.enCours}</span> in progress
        </span>
        <span>
          <span className="font-semibold text-foreground">{brief.bloque}</span> blocked
        </span>
      </div>

      {brief.blocagesActifs.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-review">Active blockers</p>
          {brief.blocagesActifs.map((b) => (
            <p key={b.id} className="text-sm text-foreground">
              {b.tache.titre}
              {b.responsable && <>: waiting on {b.responsable.nom}</>}
              {b.cause && <span className="text-muted-foreground"> ({b.cause})</span>}
            </p>
          ))}
        </div>
      )}

      {brief.aRisque.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-declared">At risk</p>
          {brief.aRisque.map((t) => (
            <p key={t.id} className="text-sm text-foreground">
              {t.titre}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function PendingRow({ tache, onChange }: { tache: Tache; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function decide(decision: 'ok' | 'litige') {
    setBusy(true);
    try {
      await validerTache(tache.id, decision);
      onChange();
      toast(decision === 'ok' ? 'Task approved' : 'Sent back for rework');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{tache.titre}</p>
          <p className="text-xs text-muted-foreground">
            {tache.assigneA?.nom ?? 'Unassigned'}
            {tache.dateDeclaration && ` · marked done ${formatWhen(tache.dateDeclaration)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" disabled={busy} onClick={() => decide('ok')}>
            Approve
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide('litige')}>
            Send back
          </Button>
        </div>
      </div>
      <p className="text-xs italic text-muted-foreground">
        {tache.commentaireDeclaration ? `"${tache.commentaireDeclaration}"` : 'No comment'}
      </p>
    </div>
  );
}

export default function CheckInPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;
  const { user } = useAuth();

  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [taches, setTaches] = useState<Tache[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [historyFrom, setHistoryFrom] = useState(today);
  const [historyTo, setHistoryTo] = useState(today);

  async function load() {
    const [bur, br, t] = await Promise.all([getBureau(bureauId), getDailyBrief(bureauId), listBureauTaches(bureauId)]);
    setBureau(bur);
    setBrief(br);
    setTaches(t);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  const isAdmin = user?.roleGlobal === 'ADMIN';
  const isManager =
    isAdmin ||
    (user?.roleGlobal === 'MANAGER' && bureau?.membres.some((m) => m.user.id === user?.id)) ||
    false;

  const pending = useMemo(() => taches?.filter((t) => t.statut === 'DECLARE') ?? [], [taches]);
  const approved = useMemo(() => {
    if (!taches) return [];
    const from = new Date(historyFrom);
    const to = new Date(historyTo);
    to.setUTCHours(23, 59, 59, 999);
    return taches
      .filter((t) => t.statut === 'VALIDE' && t.dateValidation)
      .filter((t) => {
        const d = new Date(t.dateValidation!);
        return d >= from && d <= to;
      })
      .sort((a, b) => new Date(b.dateValidation!).getTime() - new Date(a.dateValidation!).getTime());
  }, [taches, historyFrom, historyTo]);

  if (!bureau) return <Loading className="text-sm" />;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Check-In' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check-In</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isManager ? 'Review and approve what got marked done.' : "See how today's work is going."}
        </p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings={isManager} />

      {brief && <DailyBriefCard brief={brief} />}

      {isManager && (
        <Card>
          <h2 className="text-sm font-semibold text-foreground">Waiting for your approval</h2>
          {taches === null ? (
            <Loading className="mt-3 text-sm" />
          ) : pending.length === 0 ? (
            <EmptyState>Nothing waiting for approval right now.</EmptyState>
          ) : (
            <div className="mt-2 flex flex-col">
              {pending.map((t) => (
                <PendingRow key={t.id} tache={t} onChange={load} />
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2">
            <ChevronIcon className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${historyOpen ? 'rotate-90' : ''}`} />
            <span className="text-sm font-semibold text-foreground">Approved tasks</span>
          </span>
          <span className="text-xs text-muted-foreground">{approved.length} in range</span>
        </button>
        {historyOpen && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                From
                <input
                  type="date"
                  value={historyFrom}
                  max={historyTo}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                To
                <input
                  type="date"
                  value={historyTo}
                  min={historyFrom}
                  onChange={(e) => setHistoryTo(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
                />
              </label>
            </div>
            {approved.length === 0 ? (
              <EmptyState>No task validated in this range.</EmptyState>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {approved.map((t) => (
                  <div key={t.id} className="py-2.5 text-sm">
                    <p className="text-foreground">{t.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.assigneA?.nom ?? 'Unassigned'} · approved by {t.valideur?.nom ?? '—'} ·{' '}
                      {t.dateValidation && formatWhen(t.dateValidation)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
