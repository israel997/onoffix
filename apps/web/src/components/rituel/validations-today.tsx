'use client';

import { useEffect, useState } from 'react';
import { ChevronIcon } from '@/components/icons/office-icons';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { getValidationsAujourdhui, type ValidationAujourdhui } from '@/lib/api';

/** Qui a validé quoi aujourd'hui — vue informative, aucune action ici. */
export function ValidationsToday() {
  const [validations, setValidations] = useState<ValidationAujourdhui[] | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getValidationsAujourdhui().then(setValidations);
  }, []);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (validations === null) return <Loading className="text-sm" />;
  if (validations.length === 0) {
    return (
      <Card>
        <EmptyState>No task validated yet today.</EmptyState>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {validations.map((v) => {
        const open = openIds.has(v.user.id);
        return (
          <Card key={v.user.id}>
            <button onClick={() => toggle(v.user.id)} className="flex w-full items-center gap-2 text-left">
              <ChevronIcon
                className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
              />
              <h2 className="text-sm font-semibold text-foreground">
                {v.user.nom} ({v.taches.length} task{v.taches.length > 1 ? 's' : ''})
              </h2>
            </button>
            {open && (
              <div className="mt-3 flex flex-col divide-y divide-border pl-5">
                {v.taches.map((t) => (
                  <p key={t.id} className="py-1.5 text-sm text-foreground">
                    {t.titre}
                  </p>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
