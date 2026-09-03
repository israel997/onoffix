'use client';

import { Skeleton } from '@/components/ui/skeleton';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BuildingIcon, DoorIcon, MailIcon } from '@/components/icons/office-icons';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  acceptBureauInvitation,
  createBureau,
  declineBureauInvitation,
  listBureaux,
  listMyBureauInvitations,
  reorderBureaux,
  resolveAssetUrl,
  type Bureau,
  type MyBureauInvitation,
} from '@/lib/api';
import { BUREAU_COLORS } from '@/lib/bureau-colors';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function OfficesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [bureaux, setBureaux] = useState<Bureau[] | null>(null);
  const [invitations, setInvitations] = useState<MyBureauInvitation[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());

  async function load() {
    const [bureauxData, invitationsData] = await Promise.all([listBureaux(), listMyBureauInvitations()]);
    setBureaux(bureauxData);
    setInvitations(invitationsData);
  }

  async function handleAcceptInvitation(invitation: MyBureauInvitation) {
    if (inFlightRef.current.has(invitation.id)) return;
    inFlightRef.current.add(invitation.id);
    setRespondingId(invitation.id);
    try {
      await acceptBureauInvitation(invitation.id);
      toast(`You joined ${invitation.bureau.nom}`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      // Déjà traitée (double clic, coupure réseau...) : la liste va se remettre à
      // jour toute seule ci-dessous, pas la peine d'afficher une erreur alarmante.
      if (message === 'Invitation introuvable') {
        toast('This invitation was already handled.');
      } else {
        toast(message, 'error');
      }
      await load();
    } finally {
      inFlightRef.current.delete(invitation.id);
      setRespondingId(null);
    }
  }

  async function handleDeclineInvitation(invitation: MyBureauInvitation) {
    if (inFlightRef.current.has(invitation.id)) return;
    inFlightRef.current.add(invitation.id);
    setRespondingId(invitation.id);
    try {
      await declineBureauInvitation(invitation.id);
      toast(`Invitation to ${invitation.bureau.nom} declined`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message === 'Invitation introuvable') {
        toast('This invitation was already handled.');
      } else {
        toast(message, 'error');
      }
      await load();
    } finally {
      inFlightRef.current.delete(invitation.id);
      setRespondingId(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Un collaborateur qui accepte une invitation ailleurs ne déclenche rien ici — on
    // repasse périodiquement pour refléter les changements sans recharger la page.
    const interval = setInterval(load, 20_000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createBureau({ nom });
      setNom('');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!bureaux) return;
    const target = index + direction;
    if (target < 0 || target >= bureaux.length) return;

    const reordered = [...bureaux];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBureaux(reordered);
    setReordering(true);
    try {
      await reorderBureaux(reordered.map((b) => b.id));
    } finally {
      setReordering(false);
    }
  }

  const isAdmin = user?.roleGlobal === 'ADMIN';

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Offices' }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Offices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Teams and departments in your organisation.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowForm((v) => !v)}
            aria-label={showForm ? 'Cancel' : 'New office'}
            title={showForm ? 'Cancel' : 'New office'}
          >
            {showForm ? '✕' : <BuildingIcon className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardTitle>Pending office invitations</CardTitle>
          <div className="mt-3 flex flex-col divide-y divide-border">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.bureau.nom}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={respondingId === inv.id}
                    onClick={() => handleAcceptInvitation(inv)}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={respondingId === inv.id}
                    onClick={() => handleDeclineInvitation(inv)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <Label className="flex-1">
              Office name
              <Input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dev Team" />
            </Label>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-status-review">{error}</p>}
        </Card>
      )}

      {bureaux === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-3 h-16" />
            </Card>
          ))}
        </div>
      ) : bureaux.length === 0 ? (
        <Card>
          <EmptyState>No office yet.</EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bureaux.map((bureau, index) => {
            const photoSrc = resolveAssetUrl(bureau.photoUrl);
            const isDanger = bureau.niveauAlerte !== 'AUCUNE';
            // Card applique déjà bg-surface/border-border comme classes de base : à spécificité
            // égale, un className concurrent ne gagne pas de façon fiable (cn() ne fait pas de
            // merge façon tailwind-merge) — un style inline force la couleur sans ambiguïté.
            const dangerColor = bureau.niveauAlerte === 'ROUGE' ? 'var(--status-review)' : 'var(--status-declared)';
            return (
              <Card
                key={bureau.id}
                className={`flex flex-col gap-4 py-6 ${isDanger ? 'text-white' : ''}`}
                style={isDanger ? { backgroundColor: dangerColor, borderColor: dangerColor } : undefined}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    {photoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoSrc} alt={bureau.nom} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className={`h-3 w-3 shrink-0 rounded-full ${isDanger ? 'bg-white' : BUREAU_COLORS[bureau.couleur].dot}`} />
                    )}
                    {bureau.unreadCount > 0 && (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isDanger ? 'bg-white/20 text-white' : 'bg-status-review/10 text-status-review'}`}
                      >
                        <MailIcon className="h-3.5 w-3.5" />
                        {bureau.unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isDanger ? 'text-white' : 'text-foreground'}`}>{bureau.nom}</p>
                    <p className={`text-xs ${isDanger ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {bureau.tachesCount} task{bureau.tachesCount === 1 ? '' : 's'} · Daily check-in at {bureau.heureDeclaration}
                    </p>
                  </div>
                  {isDanger && (
                    <p className="text-sm font-semibold">
                      {bureau.niveauAlerte === 'ROUGE' ? 'This office is on fire' : 'This office is on alert!'}
                    </p>
                  )}
                  <div className={`flex items-center gap-3 text-xs ${isDanger ? 'text-white/80' : 'text-muted-foreground'}`}>
                    <span>
                      {bureau._count.membres} member{bureau._count.membres === 1 ? '' : 's'}
                    </span>
                    <span>· created {new Date(bureau.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/offices/${bureau.id}`}
                    aria-label={`Enter ${bureau.nom}`}
                    title={`Enter ${bureau.nom}`}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${isDanger ? 'text-white hover:bg-white/10' : 'text-brand-blue hover:bg-brand-blue-light'}`}
                  >
                    <DoorIcon className="h-5 w-5" />
                    Enter
                  </Link>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={reordering || index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={reordering || index === bureaux.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
