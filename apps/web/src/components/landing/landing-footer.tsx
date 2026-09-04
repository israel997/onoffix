'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS_EN = [
  { href: '/#how', label: 'How it works' },
  { href: '/#ritual', label: 'The ritual' },
  { href: '/#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

const LINKS_FR = [
  { href: '/fr/#how', label: 'Comment ça marche' },
  { href: '/fr/#ritual', label: 'Le rituel' },
  { href: '/fr/#features', label: 'Fonctionnalités' },
  { href: '/fr/pricing', label: 'Tarifs' },
  { href: '/fr/docs', label: 'Docs' },
];

export function LandingFooter() {
  const pathname = usePathname() ?? '/';
  const isFr = pathname.startsWith('/fr');
  const links = isFr ? LINKS_FR : LINKS_EN;

  return (
    <footer>
      <div className="wrap">
        <div className="footer-inner">
          <Link href={isFr ? '/fr' : '/'} className="logo">
            <Image src="/logo.png" alt="OOffix" width={132} height={66} className="h-6 w-auto opacity-80" />
          </Link>
          <div className="footer-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="footer-copy">
            {isFr ? "© 2026 OOffix - le bureau numérique de votre équipe" : "© 2026 OOffix - your team's digital office"}
          </div>
        </div>
      </div>
    </footer>
  );
}
