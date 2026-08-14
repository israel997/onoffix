'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
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

  async function load() {
    const [bureauxData, invitationsData] = await Promise.all([listBureaux(), listMyBureauInvitations()]);
    setBureaux(bureauxData);
    setInvitations(invitationsData);
  }

  async function handleAcceptInvitation(invitation: MyBureauInvitation) {
    setRespondingId(invitation.id);
    try {
      await acceptBureauInvitation(invitation.id);
      toast(`You joined ${invitation.bureau.nom}`);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setRespondingId(null);
    }
  }

  async function handleDeclineInvitation(invitation: MyBureauInvitation) {
    setRespondingId(invitation.id);
    try {
      await declineBureauInvitation(invitation.id);
      toast(`Invitation to ${invitation.bureau.nom} declined`);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setRespondingId(null);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
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
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New office'}</Button>
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
                  <Badge tone="neutral">{inv.roleDansBureau === 'MANAGER' ? 'Manager' : 'Collaborator'}</Badge>
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : bureaux.length === 0 ? (
        <Card>
          <CardDescription>No office yet.</CardDescription>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {bureaux.map((bureau, index) => {
            const photoSrc = resolveAssetUrl(bureau.photoUrl);
            return (
              <Card key={bureau.id} className="flex items-center justify-between gap-4 py-4">
                <Link href={`/offices/${bureau.id}`} className="flex flex-1 items-center gap-4">
                  {photoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoSrc} alt={bureau.nom} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className={`h-3 w-3 shrink-0 rounded-full ${BUREAU_COLORS[bureau.couleur].dot}`} />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{bureau.nom}</p>
                    <p className="text-xs text-muted-foreground">Daily check-in at {bureau.heureDeclaration}</p>
                  </div>
                </Link>
                {isAdmin && (
                  <div className="flex shrink-0 gap-1">
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
