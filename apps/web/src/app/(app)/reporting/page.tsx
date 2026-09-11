'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChartIcon, LockIcon } from '@/components/icons/office-icons';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ListSkeleton } from '@/components/ui/skeleton';
import { createRapport, listRapports, type RapportSummary, type TypeRapport } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function NewReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [nom, setNom] = useState('');
  const [type, setType] = useState<TypeRapport>('GENERAL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleCreate() {
    if (!nom.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const rapport = await createRapport(nom.trim(), type);
      toast('Report created');
      onCreated(rapport.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold text-foreground">New report</h2>
      <div className="mt-4 flex flex-col gap-3">
        <Label>
          Name
          <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="e.g. Marketing — Week 37" />
        </Label>
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Type</p>
          <div className="flex gap-2">
            {(['GENERAL', 'WEEKLY'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  type === t
                    ? 'border-brand-blue bg-brand-blue-light text-brand-blue-dark'
                    : 'border-border bg-surface text-muted-foreground hover:border-brand-blue/50'
                }`}
              >
                {t === 'GENERAL' ? 'General' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-status-review">{error}</p>}
        <div className="mt-1 flex gap-2">
          <Button size="sm" disabled={busy} onClick={handleCreate}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ReportingPage() {
  const router = useRouter();
  const [reports, setReports] = useState<RapportSummary[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const data = await listRapports(false);
    setReports(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reporting' }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
            <ChartIcon className="h-6 w-6 text-brand-blue" />
            Reporting
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Project reports, shared across the organisation.</p>
        </div>
        <Button onClick={() => setShowNew(true)}>New report</Button>
      </div>

      <Card>
        <CardTitle>Reports</CardTitle>
        {reports === null ? (
          <div className="mt-3">
            <ListSkeleton rows={4} />
          </div>
        ) : reports.length === 0 ? (
          <div className="mt-3">
            <EmptyState>No report yet.</EmptyState>
          </div>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => router.push(`/reporting/${r.id}`)}
                className="flex items-center justify-between gap-3 py-3 text-left hover:bg-surface-muted"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {r.estPrive && <LockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.createur.nom} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge tone={r.type === 'WEEKLY' ? 'brand' : 'neutral'}>
                  {r.type === 'WEEKLY' ? 'Weekly' : 'General'}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      {showNew && (
        <NewReportModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/reporting/${id}`)}
        />
      )}
    </div>
  );
}
