import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <Card className="max-w-sm text-center">
        <p className="text-5xl font-bold text-brand-blue">404</p>
        <CardTitle className="mt-3">Page not found</CardTitle>
        <CardDescription className="mt-1">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </CardDescription>
        <Link href="/dashboard">
          <Button className="mt-6 w-full">Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
