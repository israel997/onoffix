'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isNeedsOrganisationSelection, login, storeTokens, type OrganisationOption } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organisations, setOrganisations] = useState<OrganisationOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (isNeedsOrganisationSelection(result)) {
        setOrganisations(result.organisations);
        return;
      }
      storeTokens(result);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectOrganisation(organisationId: string) {
    setError(null);
    setLoading(true);
    try {
      const result = await login({ email, password, organisationId });
      if (isNeedsOrganisationSelection(result)) return;
      storeTokens(result);
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (organisations) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose an organisation</CardTitle>
          <CardDescription>Your account belongs to more than one.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-2">
          {organisations.map((org) => (
            <button
              key={org.id}
              disabled={loading}
              onClick={() => handleSelectOrganisation(org.id)}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-50"
            >
              {org.nom}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-status-review">{error}</p>}
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-fit"
          onClick={() => {
            setOrganisations(null);
            setError(null);
          }}
        >
          Back
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back to your office.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label>
          Email
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Label>
        <Label>
          Password
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Label>
        <Link href="/forgot-password" className="-mt-2 text-sm text-brand-blue hover:underline">
          Forgot password?
        </Link>
        {error && <p className="text-sm text-status-review">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        No organisation yet?{' '}
        <Link href="/register" className="font-medium text-brand-blue hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}
