'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <Card className="max-w-sm text-center">
        <p className="text-5xl font-bold text-status-review">500</p>
        <CardTitle className="mt-3">Something went wrong</CardTitle>
        <CardDescription className="mt-1">
          An unexpected error occurred. You can try again, or head back to the dashboard.
        </CardDescription>
        <Button className="mt-6 w-full" onClick={() => reset()}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
