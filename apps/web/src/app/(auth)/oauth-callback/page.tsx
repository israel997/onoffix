'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { storeTokens } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function OauthCallbackContent() {
  const router = useRouter();
  const { refresh } = useAuth();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (!accessToken || !refreshToken) {
      router.replace('/login?error=google_auth_failed');
      return;
    }
    storeTokens({ accessToken, refreshToken });
    refresh().then(() => router.replace('/dashboard'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full max-w-sm text-center">
      <CardTitle>Signing you in…</CardTitle>
      <CardDescription className="mt-1">One moment.</CardDescription>
    </Card>
  );
}

export default function OauthCallbackPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm text-center"><CardTitle>Loading…</CardTitle></Card>}>
      <OauthCallbackContent />
    </Suspense>
  );
}
