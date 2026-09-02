import Image from 'next/image';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="footer-inner">
          <Link href="/" className="logo">
            <Image src="/logo.png" alt="OOffix" width={132} height={66} className="h-6 w-auto opacity-80" />
          </Link>
          <div className="footer-links">
            <Link href="/#how">How it works</Link>
            <Link href="/#ritual">The ritual</Link>
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="footer-copy">© 2026 OOffix - your team&apos;s digital office</div>
        </div>
      </div>
    </footer>
  );
}
