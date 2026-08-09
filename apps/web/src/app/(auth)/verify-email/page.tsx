'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyEmail } from '@/lib/api';

type Status = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      setError('Missing verification token.');
      return;
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed.');
      });
  }, [token]);

  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader>
        <CardTitle>
          {status === 'loading' && 'Verifying your email…'}
          {status === 'success' && 'Email confirmed'}
          {status === 'error' && 'Verification failed'}
        </CardTitle>
        <CardDescription>
          {status === 'success' && 'Your email address has been confirmed.'}
          {status === 'error' && error}
        </CardDescription>
      </CardHeader>
      {status !== 'loading' && (
        <Link href="/dashboard">
          <Button className="w-full">Go to dashboard</Button>
        </Link>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Verifying your email…</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
