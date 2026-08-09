'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user.nom.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Know exactly how your team is progressing on their tasks.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Offices</CardTitle>
            <CardDescription>Manage your teams and their members.</CardDescription>
          </CardHeader>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projects & tasks</CardTitle>
            <CardDescription>Track work across every office.</CardDescription>
          </CardHeader>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily check-in</CardTitle>
            <CardDescription>Declare and validate daily progress.</CardDescription>
          </CardHeader>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </Card>
      </div>
    </div>
  );
}
