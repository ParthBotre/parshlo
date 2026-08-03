import Link from 'next/link';

import { BrandMark } from '@/components/brand/brand-mark';
import { site } from '@/lib/site';

export function SiteFooter(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border/40 bg-card/50 border-t">
      <div className="container grid gap-10 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <BrandMark size={40} alt="" />
            <span className="font-display text-lg font-bold uppercase leading-none tracking-wide">
              Parshlo
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{site.description}</p>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
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
            <li>
              <Link className="hover:text-foreground" href="/people">
                People
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
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
          <h4 className="font-display text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Reach us
          </h4>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>{site.contact.address}</li>
            <li>
              <a href={`mailto:${site.contact.email}`} className="hover:text-foreground">
                {site.contact.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, '')}`}
                className="hover:text-foreground"
              >
                {site.contact.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-border/60 border-t">
        <div className="text-muted-foreground container flex flex-col items-center justify-between gap-2 py-6 text-xs md:flex-row">
          <p>
            © {year} {site.name}. All rights reserved. Strictly B2B — not for retail sale.
          </p>
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
