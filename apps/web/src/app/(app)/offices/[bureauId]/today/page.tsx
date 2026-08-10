'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OfficeNav } from '@/components/offices/office-nav';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { getBureau, getBureauRituel, validerRituelMembre, type BureauDetail, type BureauRituelMembre } from '@/lib/api';

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: 'Waiting for validation',
  VALIDEE: 'Validated',
  LITIGE: 'In dispute',
};

function MemberRow({ membre, bureauId, onChange }: { membre: BureauRituelMembre; bureauId: string; onChange: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(
    new Set(membre.taches.filter((t) => t.cocheParAdmin).map((t) => t.id)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(tacheId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(tacheId)) next.delete(tacheId);
      else next.add(tacheId);
      return next;
    });
  }

  async function handleValidate() {
    setSaving(true);
    setError(null);
    try {
      await validerRituelMembre(bureauId, membre.user.id, [...checked]);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{membre.user.nom}</p>
        <div className="flex items-center gap-2">
          {!membre.declare && <Badge tone="review">Not declared yet</Badge>}
          {membre.pourcentage !== null && (
            <Badge tone={membre.pourcentage === 100 ? 'validated' : 'brand'}>{membre.pourcentage}%</Badge>
          )}
          {membre.statutValidation && (
            <Badge tone={membre.statutValidation === 'VALIDEE' ? 'validated' : 'declared'}>
              {STATUT_LABEL[membre.statutValidation]}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col divide-y divide-border">
        {membre.taches.map((t) => (
          <label key={t.id} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={checked.has(t.id)}
              onChange={() => toggle(t.id)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="flex-1 text-sm text-foreground">{t.titre}</span>
            {t.cocheParMembre ? (
              <Badge tone="declared">Declared by member</Badge>
            ) : (
              <Badge tone="neutral">Not declared</Badge>
            )}
          </label>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-status-review">{error}</p>}

      <Button
        className="mt-3 w-fit"
        size="sm"
        disabled={saving || !membre.declare}
        onClick={handleValidate}
      >
        {saving ? 'Saving…' : 'Validate'}
      </Button>
    </Card>
  );
}

export default function TodayRituelPage() {
  const params = useParams<{ bureauId: string }>();
  const bureauId = params.bureauId;

  const [bureau, setBureau] = useState<BureauDetail | null>(null);
  const [membres, setMembres] = useState<BureauRituelMembre[] | null>(null);

  async function load() {
    const [bur, rit] = await Promise.all([getBureau(bureauId), getBureauRituel(bureauId)]);
    setBureau(bur);
    setMembres(rit);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bureauId]);

  if (!bureau) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Offices', href: '/offices' },
          { label: bureau.nom, href: `/offices/${bureauId}` },
          { label: 'Today' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Today</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and confirm what each collaborator got done today.
        </p>
      </div>

      <OfficeNav bureauId={bureauId} showSettings />

      {membres === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : membres.length === 0 ? (
        <Card>
          <CardDescription>No task with a target date for today in this office.</CardDescription>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {membres.map((m) => (
            <MemberRow key={m.user.id} membre={m} bureauId={bureauId} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}
