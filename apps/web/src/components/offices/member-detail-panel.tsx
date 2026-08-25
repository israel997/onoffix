'use client';

import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { resolveAssetUrl, type OrganisationMembre } from '@/lib/api';

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatBirthday(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'long' });
}

export function MemberDetailPanel({ membre, onClose }: { membre: OrganisationMembre; onClose: () => void }) {
  const photoSrc = resolveAssetUrl(membre.photoUrl);

  return (
    <Drawer onClose={onClose}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt={membre.nom} className="h-14 w-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-navy text-lg font-semibold text-white">
              {initials(membre.nom)}
            </span>
          )}
          <div>
            <h2 className="text-lg font-bold text-foreground">{membre.nom}</h2>
            <p className="text-sm text-muted-foreground">{membre.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Job title</p>
          <p className="text-foreground">{membre.poste ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Hierarchy</p>
          <p className="text-foreground">{membre.hierarchie ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Joined</p>
          <p className="text-foreground">{formatDate(membre.createdAt)}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Birthday</p>
          <p className="text-foreground">{formatBirthday(membre.dateAnniversaire) ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">Offices</p>
          {membre.bureaux.length === 0 ? (
            <p className="text-foreground">—</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {membre.bureaux.map((b) => (
                <Badge key={b.bureau.id} tone="neutral">
                  {b.bureau.nom}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">What they like</p>
          <p className="whitespace-pre-wrap text-foreground">{membre.aime ?? '—'}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground">What they don&apos;t like</p>
          <p className="whitespace-pre-wrap text-foreground">{membre.naimePas ?? '—'}</p>
        </div>
      </div>
    </Drawer>
  );
}
