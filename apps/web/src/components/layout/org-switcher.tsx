'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getMyOrganisations, storeTokens, switchOrganisation, type MyOrganisation } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function OrgSwitcher({ organisationNom }: { organisationNom: string }) {
  const { refresh } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [organisations, setOrganisations] = useState<MyOrganisation[] | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setError(null);
      setOrganisations(await getMyOrganisations());
    }
  }

  async function handleSwitch(org: MyOrganisation) {
    if (org.current) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setError(null);
    try {
      const tokens = await switchOrganisation(org.id);
      storeTokens(tokens);
      await refresh();
      setOpen(false);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-left hover:bg-surface-muted"
      >
        <span className="text-sm font-semibold text-foreground">{organisationNom}</span>
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-muted-foreground">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your organisations
          </p>
          {organisations === null ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading…</p>
          ) : (
            organisations.map((org) => (
              <button
                key={org.id}
                disabled={switching}
                onClick={() => handleSwitch(org)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
              >
                <span className="truncate text-foreground">{org.nom}</span>
                {org.current && <span className="shrink-0 text-xs font-medium text-brand-blue">Current</span>}
              </button>
            ))
          )}
          {error && <p className="px-3 py-1 text-xs text-status-review">{error}</p>}
          <div className="mt-1 border-t border-border pt-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push('/organisations/new');
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-blue hover:bg-surface-muted"
            >
              + Create organisation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
