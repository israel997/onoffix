'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { declineInvitation, getInvitationPreview, type InvitationPreview } from '@/lib/api';

function DeclineInviteContent() {
  const token = useSearchParams().get('token');

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewError('Missing invitation token.');
      return;
    }
    getInvitationPreview(token)
      .then(setPreview)
      .catch((err) => setPreviewError(err instanceof Error ? err.message : 'Invalid invitation.'));
  }, [token]);

  async function handleDecline() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await declineInvitation(token);
      setDeclined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (declined) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Invitation declined</CardTitle>
          <CardDescription>You won&apos;t be added to this organisation.</CardDescription>
        </CardHeader>
        <Link href="/login">
          <Button className="w-full">Go to login</Button>
        </Link>
      </Card>
    );
  }

  if (previewError) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Invitation invalid</CardTitle>
          <CardDescription>{previewError}</CardDescription>
        </CardHeader>
        <Link href="/login">
          <Button className="w-full">Go to login</Button>
        </Link>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Loading invitation…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Decline invitation?</CardTitle>
        <CardDescription>
          Hi {preview.nom}, you were invited to join {preview.organisationNom} as{' '}
          {preview.roleGlobal === 'ADMIN' ? 'Admin' : 'Member'}. Declining means you won&apos;t be added.
        </CardDescription>
      </CardHeader>
      {error && <p className="text-sm text-status-review">{error}</p>}
      <div className="flex flex-col gap-2">
        <Button variant="danger" disabled={loading} onClick={handleDecline}>
          {loading ? 'Declining…' : 'Decline invitation'}
        </Button>
        <Link href={`/accept-invite?token=${token}`}>
          <Button variant="secondary" className="w-full">
            Actually, I want to join
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function DeclineInvitePage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm text-center"><CardHeader><CardTitle>Loading…</CardTitle></CardHeader></Card>}>
      <DeclineInviteContent />
    </Suspense>
  );
}
