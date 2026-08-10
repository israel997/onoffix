'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { declarerRituel, getAujourdhui, type Aujourdhui } from '@/lib/api';

const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: 'Waiting for validation',
  VALIDEE: 'Validated',
  LITIGE: 'In dispute',
};

export function TodayChecklist() {
  const [journee, setJournee] = useState<Aujourdhui | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await getAujourdhui();
      setJournee(data);
      setChecked(new Set(data.taches.filter((t) => t.cocheParMembre).map((t) => t.id)));
    } catch {
      // Widget non critique du dashboard — on échoue silencieusement plutôt que de casser la page.
      setJournee(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function toggle(tacheId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(tacheId)) next.delete(tacheId);
      else next.add(tacheId);
      return next;
    });
  }

  async function handleDeclare() {
    setSaving(true);
    setError(null);
    try {
      const data = await declarerRituel([...checked]);
      setJournee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (!journee) return null;
  if (journee.taches.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Today</CardTitle>
          <CardDescription>Check off what you completed today, then declare your day.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {journee.pourcentage !== null && (
            <Badge tone={journee.pourcentage === 100 ? 'validated' : 'brand'}>{journee.pourcentage}%</Badge>
          )}
          {journee.statutValidation && (
            <Badge tone={journee.statutValidation === 'VALIDEE' ? 'validated' : 'declared'}>
              {STATUT_LABEL[journee.statutValidation]}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-border">
        {journee.taches.map((t) => (
          <label key={t.id} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={checked.has(t.id)}
              onChange={() => toggle(t.id)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="flex-1 text-sm text-foreground">{t.titre}</span>
            <Badge tone={t.projet.bureau ? 'neutral' : 'brand'}>
              {t.projet.bureau ? t.projet.bureau.nom : 'Personal'}
            </Badge>
            {t.cocheParAdmin && <Badge tone="validated">Confirmed</Badge>}
          </label>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-status-review">{error}</p>}

      <Button className="mt-4 w-fit" size="sm" disabled={saving} onClick={handleDeclare}>
        {saving ? 'Saving…' : journee.declare ? 'Update my day' : 'Declare my day'}
      </Button>
    </Card>
  );
}
