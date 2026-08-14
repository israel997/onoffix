'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { acceptInvitation, getInvitationPreview, storeTokens, type InvitationPreview } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function AcceptInviteContent() {
  const router = useRouter();
  const { refresh } = useAuth();
  const token = useSearchParams().get('token');

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const tokens = await acceptInvitation(token, password);
      storeTokens(tokens);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
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
        <CardTitle>Join {preview.organisationNom}</CardTitle>
        <CardDescription>
          Hi {preview.nom}, set a password for {preview.email} to get started.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label>
          Password
          <PasswordInput
            required
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+"
            title="At least 8 characters, with an uppercase, a lowercase, a number and a special character"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Label>
        <Label>
          Confirm password
          <PasswordInput required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </Label>
        {error && <p className="text-sm text-status-review">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Joining…' : 'Join organisation'}
        </Button>
      </form>
    </Card>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm text-center"><CardHeader><CardTitle>Loading…</CardTitle></CardHeader></Card>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
