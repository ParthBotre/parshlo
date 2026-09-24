import { ArrowUpRight, Pill } from 'lucide-react';
import Link from 'next/link';

import { Card } from '@/components/ui/card';

export function ProductCta({
  eyebrow = 'Product first',
  title = 'Find the right product for your next order.',
  description = 'Explore formulations, packaging, and prescription status before signing in for wholesale ordering.',
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}): JSX.Element {
  return (
    <Card className="from-primary/15 via-card to-card border-primary/20 relative overflow-hidden bg-gradient-to-br p-7 md:p-9">
      <div className="bg-primary/15 absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl" />
      <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="text-primary flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <Pill className="h-4 w-4" />
            {eyebrow}
          </div>
          <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6 md:text-base">{description}</p>
          <div className="text-muted-foreground mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
            {['Apogest', 'Rgnest', 'Ovaborn', 'Niddydro'].map((name) => (
              <span key={name} className="bg-background/60 rounded-full border px-3 py-1.5">
                {name}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/products"
          className="text-primary group inline-flex shrink-0 items-center gap-2 text-sm font-semibold"
        >
          Explore products
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  );
}
