import {
  Activity,
  ArrowRight,
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
import Link from 'next/link';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

const PARTNER_TYPES = [
  // { icon: Building2, label: 'Hospitals' },
  { icon: Truck, label: 'Distributors' },
  // { icon: BadgeCheck, label: 'Pharmacies' },
  { icon: CircuitBoard, label: 'Stockists' },
  { icon: Activity, label: 'Chemists' },
  { icon: Globe2, label: 'Wholesalers' },
] as const;

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Focused Therapeutic Portfolio',
    body: 'A curated product range built for gynecology, wellness, and everyday clinical demand.',
  },
  {
    icon: Lock,
    title: 'Quality-First Access',
    body: 'Product details, packaging, and compliance information stay easy to inspect before ordering.',
  },
  {
    icon: FileCheck2,
    title: 'Clear Product Records',
    body: 'Each SKU is maintained with form, packaging, prescription status, and marketed-by details.',
  },
  {
    icon: TrendingUp,
    title: 'Built for Repeat Demand',
    body: 'The catalog supports fast discovery for products that partners order and reorder often.',
  },
  {
    icon: Sparkles,
    title: 'Simple Product Discovery',
    body: 'Searchable public product pages make it easier to find the right medicine quickly.',
  },
  {
    icon: Globe2,
    title: 'Pan-India Availability',
    body: 'Parshlo supports partners across India from Pune, Maharashtra.',
  },
] as const;

const STATS = [
  { value: '23', label: 'Years in Pharma Industry' },
  { value: '100', label: 'Verified B2B partners' },
  { value: '28', label: 'States served' },
  { value: '100%', label: 'On-time dispatch rate' },
] as const;

const CONCEPTS = [
  {
    prefix: 'PAR',
    meaning: 'Can symbolize “Parenthood, Pregnancy, Protection”',
    body: 'Core aspects of gynecology.',
  },
  {
    prefix: 'SH',
    meaning: 'Suggests “She, Shield, Support”',
    body: "Directly tied to women's wellness.",
  },
  {
    prefix: 'LO',
    meaning: 'Resonates with “Love, Longevity, Life”',
    body: 'Emotional and holistic care.',
  },
] as const;

export default async function HomePage(): Promise<JSX.Element> {
  let featuredProducts: Awaited<ReturnType<typeof listPublicProducts>> = [];
  try {
    featuredProducts = (await listPublicProducts({ cache: 'no-store' })).slice(0, 4);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <>
      {/* HERO ---------------------------------------------------------- */}
      <section className="grid-hero border-border/40 relative overflow-hidden border-b">
        <div className="container relative grid gap-12 py-24 md:grid-cols-2 md:py-32">
          <div className="animate-fade-in flex flex-col justify-center gap-7">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary w-fit gap-2 backdrop-blur"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Strictly B2B · Not for retail sale
            </Badge>
            <h1 className="tracking-display-tight font-display text-balance text-5xl font-bold leading-[1.05] md:text-7xl">
              The trusted platform for{' '}
              <span className="from-primary via-primary to-brand-300 bg-gradient-to-br bg-clip-text text-transparent">
                B2B Pharmaceuticals.
              </span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-balance text-lg leading-relaxed md:text-xl">
              Explore Parshlo’s therapeutic portfolio, packaging, prescription status, and marketed
              by information through a clean catalog built for fast product discovery.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Button asChild size="xl">
                <Link href="/products">View Products</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/auth/sign-in">SIGN IN</Link>
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Public catalog for product discovery. Pricing and ordering remain account-protected.
            </p>
          </div>

          {/* Product-led hero visual --------------------------------- */}
          <div className="relative hidden md:block">
            <div className="grid-noise absolute inset-0 -z-10 opacity-40" aria-hidden />
            <div className="bg-primary/15 absolute -right-10 -top-10 h-64 w-64 rounded-full blur-3xl" />
            <div className="relative grid gap-3 sm:grid-cols-2">
              {featuredProducts.length > 0
                ? featuredProducts.map((product, index) => (
                    <Link
                      key={product.slug}
                      href={`/products/${product.slug}`}
                      className={`group ${index === 0 ? 'sm:col-span-2' : ''}`}
                    >
                      <Card className="lift h-full overflow-hidden">
                        <div
                          className={`relative overflow-hidden bg-white ${index === 0 ? 'aspect-[2.4/1]' : 'aspect-[1.35/1]'}`}
                        >
                          <ProductImage
                            slug={product.slug}
                            alt={product.name}
                            imageUrls={product.imageUrls}
                            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                            iconClassName="h-12 w-12"
                          />
                          <span className="bg-background/80 absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                            {index === 0 ? 'Featured product' : 'Portfolio'}
                          </span>
                        </div>
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                          <div>
                            <p className="font-display font-semibold">
                              {product.name.toUpperCase()}
                            </p>
                            <p className="text-muted-foreground mt-1 text-xs uppercase tracking-wider">
                              {product.form} · {product.packaging}
                            </p>
                          </div>
                          <ArrowUpRight className="text-primary h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                : PARTNER_TYPES.map((p) => (
                    <Card key={p.label} className="lift group">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="bg-primary/10 text-primary ring-primary/20 flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-110">
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

      {/* PRODUCT COLLECTION ------------------------------------------ */}
      <section className="border-border/40 bg-card/30 border-b">
        <div className="container py-20 md:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary mb-4 backdrop-blur"
              >
                Product-first procurement
              </Badge>
              <h2 className="tracking-display-tight font-display text-4xl font-bold md:text-5xl">
                Start with the right SKU.
              </h2>
              <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
                Open the product profile, check the pack, and move from discovery to a confident B2B
                order.
              </p>
            </div>
            <Link
              href="/products"
              className="text-primary group inline-flex items-center gap-2 text-sm font-semibold"
            >
              View full portfolio{' '}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {featuredProducts.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <Link key={product.slug} href={`/products/${product.slug}`} className="group">
                  <Card className="h-full overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="aspect-square overflow-hidden border-b bg-white">
                      <ProductImage
                        slug={product.slug}
                        alt={product.name}
                        imageUrls={product.imageUrls}
                        className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                        iconClassName="h-16 w-16"
                      />
                    </div>
                    <CardContent className="p-5">
                      <p className="text-primary text-[10px] font-semibold uppercase tracking-[0.18em]">
                        Product profile
                      </p>
                      <h3 className="font-display mt-2 text-lg font-semibold">
                        {product.name.toUpperCase()}
                      </h3>
                      <p className="text-muted-foreground mt-2 text-xs uppercase tracking-wider">
                        {product.form} · {product.packaging}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* CONCEPT ------------------------------------------------------- */}
      <section className="border-border/40 bg-card/30 border-b">
        <div className="container grid gap-8 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary mb-4 backdrop-blur"
            >
              Conceptual Connection
            </Badge>
            <h2 className="tracking-display-tight font-display text-4xl font-bold md:text-5xl">
              PARSHLO represents care through every stage.
            </h2>
          </div>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {CONCEPTS.map((item) => (
                <Card key={item.prefix} className="h-full">
                  <CardContent className="space-y-3 p-5">
                    <p className="text-primary font-display text-3xl font-bold">{item.prefix}</p>
                    <p className="font-medium">{item.meaning}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-muted-foreground text-balance text-lg leading-relaxed">
              Together, PARSHLO can be positioned as a brand that protects and supports women with
              love and care throughout their reproductive journey.
            </p>
          </div>
        </div>
      </section>

      {/* STATS --------------------------------------------------------- */}
      <section className="border-border/40 bg-card/30 border-b">
        <div className="container grid grid-cols-2 gap-6 py-16 md:grid-cols-4 md:gap-10">
          {STATS.map((s) => (
            <div key={s.label} className="space-y-2">
              <div className="tracking-display-tight from-foreground to-foreground/60 font-display bg-gradient-to-br bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                {s.value}
              </div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES ------------------------------------------------------ */}
      <section className="container py-24 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary mb-4 backdrop-blur"
          >
            Built for compliance
          </Badge>
          <h2 className="tracking-display-tight font-display text-4xl font-bold md:text-5xl">
            Product information
            <br />
            built for confident review.
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
            The public website now keeps products first, while account-only ordering workflows stay
            behind sign-in for authorized teams.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="lift group h-full">
              <CardContent className="space-y-4 p-7">
                <div className="bg-primary/10 text-primary ring-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA STRIP ----------------------------------------------------- */}
      <section className="container pb-24">
        <div className="border-primary/20 from-primary/15 via-card to-card relative overflow-hidden rounded-3xl border bg-gradient-to-br p-10 md:p-14">
          <div
            className="absolute inset-0 -z-10 opacity-50"
            style={{
              backgroundImage:
                'radial-gradient(at 80% 20%, hsl(var(--primary) / 0.35) 0px, transparent 50%)',
            }}
            aria-hidden
          />
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-xl space-y-2">
              <h2 className="tracking-display-tight font-display text-3xl font-bold md:text-4xl">
                Looking for product details?
              </h2>
              <p className="text-muted-foreground text-base md:text-lg">
                Browse the catalog first, then sign in when you need account-protected ordering.
              </p>
            </div>
            <Button asChild size="xl">
              <Link href="/products">View products</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
