import {
  Activity,
  BadgeCheck,
  Building2,
  CircuitBoard,
  FileCheck2,
  Globe2,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const PARTNER_TYPES = [
  { icon: Building2, label: 'Hospitals' },
  { icon: Truck, label: 'Distributors' },
  { icon: BadgeCheck, label: 'Pharmacies' },
  { icon: CircuitBoard, label: 'Stockists' },
  { icon: Activity, label: 'Chemists' },
  { icon: Globe2, label: 'Wholesalers' },
] as const;

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'KYC-Verified Buyers Only',
    body: 'Drug license, pharmacy registration, and GSTIN are validated by our compliance team before pricing is unlocked.',
  },
  {
    icon: Lock,
    title: 'Auth0 + MFA',
    body: 'Multi-factor authentication, anomaly detection, and session-bound JWTs protect every order workflow.',
  },
  {
    icon: FileCheck2,
    title: 'GST-Compliant Invoicing',
    body: 'Auto-generated tax invoices with HSN, GST split, and digitally signed PDFs archived for seven years.',
  },
  {
    icon: TrendingUp,
    title: 'Real-Time Tracking',
    body: 'Order status events from received → dispatched → delivered are streamed to your dashboard.',
  },
  {
    icon: Sparkles,
    title: 'Reorder & Bulk',
    body: 'Saved frequent orders, MOQ enforcement, and bulk imports cut procurement time by up to 60%.',
  },
  {
    icon: Globe2,
    title: 'Pan-India Logistics',
    body: 'Same-day dispatch from Bengaluru, with cold-chain support for temperature-sensitive consignments.',
  },
] as const;

const STATS = [
  { value: '12+', label: 'Years in pharma manufacturing' },
  { value: '850+', label: 'Verified B2B partners' },
  { value: '28', label: 'States served' },
  { value: '99.7%', label: 'On-time dispatch rate' },
] as const;

export default function HomePage(): JSX.Element {
  return (
    <>
      {/* HERO ---------------------------------------------------------- */}
      <section className="grid-hero relative overflow-hidden border-b border-border/60">
        <div className="container relative grid gap-12 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center gap-6 animate-fade-in">
            <Badge variant="outline" className="w-fit gap-2 border-primary/30 bg-primary/5 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Strictly B2B · Not for retail sale
            </Badge>
            <h1 className="text-balance font-display text-4xl font-semibold tracking-tight md:text-6xl">
              The wholesale platform for{' '}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                verified pharmacies
              </span>{' '}
              and distributors.
            </h1>
            <p className="max-w-xl text-balance text-lg text-muted-foreground">
              Parshlo manufactures WHO-GMP certified formulations and supplies authorized partners
              across India through a secure, audit-trailed ordering platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="xl">
                <Link href="/auth/register">Request B2B Access</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/products">View Catalog</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Wholesale pricing is unlocked only after compliance review. No public checkout.
            </p>
          </div>

          {/* Hero visual ---------------------------------------------- */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 grid-noise opacity-60" aria-hidden />
            <div className="relative grid gap-4 lg:grid-cols-2">
              {PARTNER_TYPES.map((p) => (
                <Card
                  key={p.label}
                  className="border-border/60 bg-card/70 backdrop-blur"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <p.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">{p.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS --------------------------------------------------------- */}
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container grid grid-cols-2 gap-6 py-12 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {s.value}
              </div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES ------------------------------------------------------ */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
            Built for compliance
          </Badge>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Procurement infrastructure your auditors will love.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every order on Parshlo is tied to a verified GST identity, an immutable audit trail,
            and a digitally retained invoice — for seven years.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="group h-full border-border/60">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA STRIP ----------------------------------------------------- */}
      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center justify-between gap-6 py-12 md:flex-row">
          <div className="max-w-xl space-y-1">
            <h2 className="font-display text-2xl font-semibold md:text-3xl">
              Ready to onboard your business?
            </h2>
            <p className="text-primary-foreground/80">
              Submit GSTIN, drug license, and pharmacy registration — get approved within 48 hours.
            </p>
          </div>
          <Button asChild size="xl" variant="secondary">
            <Link href="/auth/register">Start verification</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
