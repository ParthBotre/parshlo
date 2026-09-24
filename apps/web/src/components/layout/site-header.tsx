import Link from 'next/link';

import { HeaderClient } from './site-header.client';

import { BrandMark } from '@/components/brand/brand-mark';
import { site } from '@/lib/site';

const NAV = [
  { href: '/products', label: 'Products' },
  { href: '/gynae-spotlight', label: 'Gynae Spotlight' },
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
      <div className="border-border/50 bg-primary/[0.04] border-t">
        <div className="container flex h-8 items-center justify-between gap-4 overflow-hidden text-[10px] font-semibold uppercase tracking-[0.16em]">
          <span className="text-primary shrink-0">New gynae launch</span>
          <Link
            href="/gynae-spotlight"
            className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-2 truncate transition-colors"
          >
            Apogest · Rgnest · Ovaborn · Ovaborn XT · Niddydro
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
