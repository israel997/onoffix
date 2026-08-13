'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerOrganisation, storeTokens } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [organisationNom, setOrganisationNom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const tokens = await registerOrganisation({ organisationNom, nom, email, password });
      storeTokens(tokens);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your organisation</CardTitle>
        <CardDescription>Set up OOffix for your team in a minute.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label>
          Organisation name
          <Input required value={organisationNom} onChange={(e) => setOrganisationNom(e.target.value)} />
        </Label>
        <Label>
          Your name
          <Input required value={nom} onChange={(e) => setNom(e.target.value)} />
        </Label>
        <Label>
          Email
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Label>
        <Label>
          Password
          <Input
            type="password"
            required
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+"
            title="At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            At least 8 characters, with an uppercase, a lowercase, a number and a special character.
          </span>
        </Label>
        <Label>
          Confirm password
          <Input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Label>
        {error && <p className="text-sm text-status-review">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Creating…' : 'Create organisation'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-blue hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
