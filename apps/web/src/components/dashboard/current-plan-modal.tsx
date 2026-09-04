'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CloseIcon } from '@/components/icons/office-icons';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { getPlan, nextPlan, type PlanKey } from '@/lib/plans';

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
    >
      <CloseIcon className="h-5 w-5" />
    </button>
  );
}

/**
 * Modale "quel est mon plan" — si l'organisation n'est pas au plan le plus haut, fermer
 * cette première modale (croix ou clic en dehors) déclenche une relance unique, sur un
 * ton différent. Fermer la relance ferme pour de bon : deux essais, pas plus.
 */
export function CurrentPlanModal({ planKey, onClose }: { planKey: PlanKey; onClose: () => void }) {
  const router = useRouter();
  const [stage, setStage] = useState<'plan' | 'retry'>('plan');
  const plan = getPlan(planKey);
  const upgrade = nextPlan(planKey);

  function seePlans() {
    onClose();
    router.push('/pricing');
  }

  function closeFirstStage() {
    if (upgrade) setStage('retry');
    else onClose();
  }

  if (stage === 'retry' && upgrade) {
    return (
      <Modal onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Pro, but relaxed</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">Still here?</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          The best is still waiting for you — less meetings, more results. {upgrade.name} is one click away.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
          <Button onClick={seePlans}>See plans</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={closeFirstStage}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your plan</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">{plan.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
        </div>
        <CloseButton onClick={closeFirstStage} />
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
            {f}
          </li>
        ))}
      </ul>

      {upgrade ? (
        <div className="mt-5 rounded-xl bg-surface-muted p-4">
          <p className="text-sm font-semibold text-foreground">Upgrade to get more</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {upgrade.features.slice(-3).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-validated" />
                {f}
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-4" onClick={seePlans}>
            See plans - from ${upgrade.price}/mo
          </Button>
        </div>
      ) : (
        <p className="mt-5 text-sm text-status-validated">You have access to everything OOffix offers.</p>
      )}
    </Modal>
  );
}
