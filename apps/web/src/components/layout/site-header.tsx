import Link from 'next/link';

import { HeaderClient } from './site-header.client';

import { BrandMark } from '@/components/brand/brand-mark';
import { site } from '@/lib/site';

const NAV = [
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/people', label: 'People' },
  { href: '/certifications', label: 'Certifications' },
  { href: '/contact', label: 'Contact' },
] as const;

export function SiteHeader(): JSX.Element {
  return (
    <header className="glass-nav border-border/60 sticky top-0 z-50 w-full border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/home"
          className="group flex items-center gap-2.5"
          aria-label={`${site.name} — home`}
        >
          <BrandMark
            size={40}
            priority
            alt=""
            className="transition-transform group-hover:scale-105"
          />
          <span className="font-display text-base font-bold uppercase leading-none tracking-wide md:text-lg">
            Parshlo
          </span>
        </Link>

        <HeaderClient nav={NAV} session={null} />
      </div>
    </header>
  );
}
