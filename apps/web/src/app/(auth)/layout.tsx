import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <Link href="/">
        <Image src="/logo.png" alt="OOffix" width={176} height={88} priority className="h-10 w-auto" />
      </Link>
      {children}
    </main>
  );
}
