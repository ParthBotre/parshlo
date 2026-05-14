import Link from 'next/link';

import { getSession } from '@/lib/auth/session';
import { site } from '@/lib/site';

import { HeaderClient } from './site-header.client';

const NAV = [
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/certifications', label: 'Certifications' },
  { href: '/contact', label: 'Contact' },
] as const;

export async function SiteHeader(): Promise<JSX.Element> {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <span className="font-display text-sm font-bold">P</span>
          </span>
          <span className="tracking-tight">{site.shortName}</span>
        </Link>

        <HeaderClient nav={NAV} session={session ? { user: session.user } : null} />
      </div>
    </header>
  );
}
