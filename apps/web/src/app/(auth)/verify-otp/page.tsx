'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resendOtp, storeTokens, verifyOtp } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyOtpContent() {
  const router = useRouter();
  const { refresh } = useAuth();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const shouldAutoResend = params.get('resend') === '1';
  const autoResentRef = useRef(false);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (shouldAutoResend && !autoResentRef.current && email) {
      autoResentRef.current = true;
      resendOtp(email)
        .then(() => setCooldown(RESEND_COOLDOWN_SECONDS))
        .catch(() => undefined);
    }
  }, [shouldAutoResend, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await verifyOtp(email, code);
      storeTokens(tokens);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      await resendOtp(email);
      setNotice('A new code was sent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Missing email</CardTitle>
          <CardDescription>Go back and register or log in again.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Confirm your email</CardTitle>
        <CardDescription>Enter the 6-digit code we sent to {email}.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label>
          Verification code
          <Input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoFocus
            placeholder="123456"
            className="text-center text-lg tracking-[0.5em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </Label>
        {error && <p className="text-sm text-status-review">{error}</p>}
        {notice && <p className="text-sm text-status-validated">{notice}</p>}
        <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
          {loading ? 'Verifying…' : 'Verify'}
        </Button>
      </form>
      <button
        onClick={handleResend}
        disabled={resending || cooldown > 0}
        className="mt-4 w-full text-center text-sm font-medium text-brand-blue hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
      >
        {cooldown > 0 ? `Resend code (${cooldown}s)` : resending ? 'Sending…' : 'Resend code'}
      </button>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<Card className="w-full max-w-sm text-center"><CardHeader><CardTitle>Loading…</CardTitle></CardHeader></Card>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
