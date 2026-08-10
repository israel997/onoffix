'use client';

import Link from 'next/link';
import { TodayChecklist } from '@/components/rituel/today-checklist';
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

      <TodayChecklist />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/offices">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>Offices</CardTitle>
              <CardDescription>Manage your teams and their members.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/my-tasks">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Everything assigned to you, everywhere.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/my-organizer">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>My Organizer</CardTitle>
              <CardDescription>Your private brain dump.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
