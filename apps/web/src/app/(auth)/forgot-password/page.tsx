'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for {email}, a reset link is on its way.
          </CardDescription>
        </CardHeader>
        <Link href="/login">
          <Button variant="secondary" className="w-full">Back to login</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>We&apos;ll email you a link to reset it.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label>
          Email
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Label>
        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-brand-blue hover:underline">Back to login</Link>
      </p>
    </Card>
  );
}
