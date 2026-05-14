import Link from 'next/link';

import { site } from '@/lib/site';

export function SiteFooter(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-display text-sm font-bold">P</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              {site.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{site.description}</p>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Platform
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="hover:text-foreground" href="/products">
                Products
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/certifications">
                Certifications
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/about">
                About
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            B2B
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="hover:text-foreground" href="/auth/register">
                Request Access
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/auth/sign-in">
                Sign in
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Reach us
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{site.contact.address}</li>
            <li>
              <a href={`mailto:${site.contact.email}`} className="hover:text-foreground">
                {site.contact.email}
              </a>
            </li>
            <li>
              <a href={`tel:${site.contact.phone.replace(/\s/g, '')}`} className="hover:text-foreground">
                {site.contact.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {year} {site.name}. All rights reserved. Strictly B2B — not for retail sale.</p>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
