import {
  Activity,
  ArrowUpRight,
  CircuitBoard,
  FileCheck2,
  Globe2,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { ProductCta } from '@/components/layout/product-cta';

export const metadata: Metadata = {
  title: 'About Parshlo',
  description: 'Learn about Parshlo, its pharmaceutical portfolio, and its B2B partner platform.',
};

const STATS = [
  { value: '23', label: 'Years in the pharma industry' },
  { value: '100', label: 'Verified B2B partners' },
  { value: '28', label: 'States served' },
  { value: '100%', label: 'On-time dispatch rate' },
] as const;

const PARTNERS = [
  { icon: Truck, label: 'Distributors' },
  { icon: CircuitBoard, label: 'Stockists' },
  { icon: Activity, label: 'Chemists' },
  { icon: Globe2, label: 'Wholesalers' },
] as const;

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Focused therapeutic portfolio',
    body: 'A curated product range for gynaecology, wellness, and everyday clinical demand.',
  },
  {
    icon: Lock,
    title: 'Quality-first access',
    body: 'Product details, packaging, and compliance information stay easy to inspect before ordering.',
  },
  {
    icon: FileCheck2,
    title: 'Clear product records',
    body: 'Each SKU is maintained with form, packaging, prescription status, and marketed-by details.',
  },
  {
    icon: TrendingUp,
    title: 'Built for repeat demand',
    body: 'The catalog supports fast discovery for products partners order and reorder often.',
  },
  {
    icon: Sparkles,
    title: 'Simple product discovery',
    body: 'Searchable public pages make it easier to find the right medicine quickly.',
  },
  {
    icon: Globe2,
    title: 'Pan-India availability',
    body: 'Parshlo supports partners across India from Pune, Maharashtra.',
  },
] as const;

const CONCEPTS = [
  {
    prefix: 'PAR',
    meaning: 'Parenthood, Pregnancy, Protection',
    body: 'Core aspects of gynaecology.',
  },
  { prefix: 'SH', meaning: 'She, Shield, Support', body: "Connected to women's wellness." },
  { prefix: 'LO', meaning: 'Love, Longevity, Life', body: 'Care across every stage.' },
] as const;

export default function AboutPage(): JSX.Element {
  return (
    <div>
      <section className="relative overflow-hidden bg-[#102f29] text-white">
        <div className="pointer-events-none absolute -right-20 -top-48 h-[38rem] w-[38rem] rounded-full border border-teal-200/15" />
        <div className="pointer-events-none absolute -right-8 -top-28 h-[27rem] w-[27rem] rounded-full border border-teal-200/15" />
        <div className="container relative grid gap-8 py-20 md:grid-cols-[0.9fr_1.1fr] md:items-end md:gap-16 md:py-28">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-200">
              About Parshlo
            </p>
            <h1 className="font-display mt-5 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] md:text-7xl">
              Care through every stage.
            </h1>
          </div>
          <div className="max-w-xl space-y-5 text-base leading-8 text-teal-50/80 md:text-lg">
            <p>
              Parshlo is a vertically integrated pharmaceutical manufacturer supplying formulations
              to hospitals, distributors, and pharmacies across India since 2024.
            </p>
            <p>
              Our digital procurement platform gives verified B2B partners a clearer way to review
              products and place compliant wholesale orders, without spreadsheets, paper invoices,
              or back-and-forth calls.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-teal-200 hover:text-white"
            >
              Explore our products <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-border/60 border-b">
        <div className="container grid grid-cols-2 gap-8 py-12 md:grid-cols-4 md:py-16">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-primary text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                {stat.value}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container grid gap-12 py-20 md:grid-cols-[0.8fr_1.2fr] md:py-24">
        <div>
          <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">
            The meaning behind our name
          </p>
          <h2 className="font-display mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
            PARSHLO represents care.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md leading-7">
            Together, the name speaks to protecting and supporting women with care throughout the
            reproductive journey.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {CONCEPTS.map((concept) => (
            <div
              key={concept.prefix}
              className="border-border/70 bg-card rounded-[1.5rem] border p-6"
            >
              <p className="font-display text-primary text-4xl font-semibold tracking-tight">
                {concept.prefix}
              </p>
              <h3 className="mt-5 text-sm font-semibold">{concept.meaning}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">{concept.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-border/60 dark:bg-card/30 border-y bg-[#f5f8f6]">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">
              Who we work with
            </p>
            <h2 className="font-display mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
              Built for pharma partners.
            </h2>
            <p className="text-muted-foreground mt-5 leading-7">
              The public catalog makes discovery simple. Pricing and ordering remain available to
              verified accounts.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNERS.map((partner) => (
              <div
                key={partner.label}
                className="border-border/70 bg-background flex items-center gap-4 rounded-2xl border p-5"
              >
                <span className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
                  <partner.icon className="h-5 w-5" />
                </span>
                <span className="font-medium">{partner.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-20 md:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.22em]">
            How the platform works
          </p>
          <h2 className="font-display mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
            Clear information. Confident review.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="border-border/70 bg-card rounded-[1.5rem] border p-7"
            >
              <span className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display mt-6 text-lg font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-6">{feature.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="border-border/70 bg-card rounded-[1.5rem] border p-7">
            <h3 className="font-display text-xl font-semibold">Compliance first</h3>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Every account is verified against GSTIN, drug license, and/or pharmacy registration.
              Transactions have an audit trail.
            </p>
          </div>
          <div className="border-border/70 bg-card rounded-[1.5rem] border p-7">
            <h3 className="font-display text-xl font-semibold">Certified quality</h3>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              A premium supply chain with batch traceability from raw material to dispatch.
            </p>
          </div>
        </div>
      </section>

      <div className="container pb-20">
        <ProductCta
          eyebrow="The Parshlo portfolio"
          title="Our product range is where the partnership starts."
          description="Explore formulations and pack formats, then sign in when you are ready to order."
        />
      </div>
    </div>
  );
}
