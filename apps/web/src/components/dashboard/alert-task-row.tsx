'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { assignerTache, getBureau, type AlerteTache, type Membre } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

const RAISON_LABEL: Record<AlerteTache['raisons'][number], string> = {
  A_RISQUE: 'At risk',
  BLOQUEE: 'Blocked',
  ECHEANCE_PROCHE: 'Due soon',
  ECHEANCE_DEPASSEE: 'Overdue',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AlertTaskRow({
  tache,
  currentUserId,
  onReassigned,
}: {
  tache: AlerteTache;
  currentUserId: string;
  onReassigned: () => void;
}) {
  const toast = useToast();
  const [reassigning, setReassigning] = useState(false);
  const [bureauMembres, setBureauMembres] = useState<Membre[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function openReassign() {
    setReassigning(true);
    if (!bureauMembres && tache.projet.bureau) {
      const bureau = await getBureau(tache.projet.bureau.id);
      setBureauMembres(bureau.membres);
    }
  }

  async function handleReassign(userId: string) {
    if (!userId) return;
    setSubmitting(true);
    try {
      await assignerTache(tache.id, userId);
      toast(`Reassigned "${tache.titre}"`);
      setReassigning(false);
      onReassigned();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const canContact = tache.assigneA && tache.assigneA.id !== currentUserId;

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{tache.titre}</p>
          <p className="text-xs text-muted-foreground">
            {tache.projet.bureau ? tache.projet.bureau.nom : 'Personal'}
            {tache.assigneA && ` · ${tache.assigneA.nom}`}
            {tache.dateEcheance && ` · Due ${formatDate(tache.dateEcheance)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tache.raisons.map((raison) => (
            <Badge key={raison} tone={raison === 'A_RISQUE' || raison === 'BLOQUEE' ? 'review' : 'declared'}>
              {RAISON_LABEL[raison]}
            </Badge>
          ))}
        </div>
      </div>

      {tache.blocages.length > 0 && tache.blocages[0].cause && (
        <p className="text-xs text-status-review">Blocked: {tache.blocages[0].cause}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href={tache.lien}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>
        {canContact && (
          <a href={`mailto:${tache.assigneA?.email}`}>
            <Button variant="ghost" size="sm">
              Contact
            </Button>
          </a>
        )}
        {tache.peutReassigner && !reassigning && (
          <Button variant="ghost" size="sm" onClick={openReassign}>
            Reassign
          </Button>
        )}
        {reassigning && (
          <select
            autoFocus
            disabled={submitting || !bureauMembres}
            defaultValue=""
            onChange={(e) => handleReassign(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
          >
            <option value="" disabled>
              {bureauMembres ? 'Assign to…' : 'Loading…'}
            </option>
            {bureauMembres?.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.nom}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
