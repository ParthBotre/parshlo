import {
  ArrowRight,
  ArrowUpRight,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Gynae Spotlight',
  description:
    'Discover Parshlo’s focused gynaecology portfolio: Apogest, Rgnest, Ovaborn, Ovaborn XT, and Niddydro.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPOTLIGHT_NAMES = ['apogest', 'rgnest', 'ovaborn', 'niddydro'];
const SPOTLIGHT_ORDER = ['apogest', 'rgnest', 'ovaborn', 'ovabornxt', 'niddydro'];

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isSpotlightProduct(name: string): boolean {
  const normalized = normalizeProductName(name);
  return SPOTLIGHT_NAMES.some((spotlightName) => normalized.includes(spotlightName));
}

function productOrder(name: string): number {
  const normalized = normalizeProductName(name);
  const match = SPOTLIGHT_ORDER.findIndex((spotlightName) => normalized.includes(spotlightName));
  return match === -1 ? SPOTLIGHT_ORDER.length : match;
}

export default async function GynaeSpotlightPage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];
  try {
    products = (await listPublicProducts({ cache: 'no-store' }))
      .filter((product) => isSpotlightProduct(product.name))
      .sort((a, b) => productOrder(a.name) - productOrder(b.name));
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <div className="min-h-screen">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(45,212,191,0.22),transparent_32%),radial-gradient(circle_at_88%_20%,rgba(20,184,166,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_54%,#042f2e_100%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="container relative grid min-h-[620px] items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-20 lg:min-h-[680px]">
          <div className="max-w-2xl">
            <Badge className="mb-6 gap-1.5 border-teal-300/25 bg-teal-300/10 text-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              New launch portfolio · 2026
            </Badge>
            <h1 className="font-display text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.05em] md:text-7xl">
              Care that feels
              <span className="mt-2 block bg-gradient-to-r from-teal-200 via-cyan-200 to-white bg-clip-text text-transparent">
                considered.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              A focused gynaecology collection from Parshlo, designed around the moments that matter
              to clinicians, partners, and the women they serve.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild className="bg-teal-300 text-slate-950 hover:bg-teal-200">
                <Link href="#collection">
                  Explore the collection <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/contact">Connect with Parshlo</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_14px_rgba(94,234,212,0.9)]" />
                Focused portfolio
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/70" />
                Wholesale ready
              </span>
            </div>
          </div>

          <div className="relative mx-auto h-[390px] w-full max-w-[430px] md:h-[470px]">
            <div className="absolute left-1/2 top-1/2 h-[315px] w-[315px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-200/15 md:h-[390px] md:w-[390px]" />
            <div className="absolute left-1/2 top-1/2 h-[235px] w-[235px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-200/20 md:h-[290px] md:w-[290px]" />
            <div className="absolute left-1/2 top-1/2 h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300/15 blur-2xl" />

            <div className="absolute left-1/2 top-1/2 w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-teal-950/50 backdrop-blur-xl md:w-[250px] md:p-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-200">
                  Parshlo / gynae
                </span>
                <HeartPulse className="h-5 w-5 text-teal-200" />
              </div>
              <div className="mt-9">
                <p className="text-5xl font-semibold tracking-[-0.06em] md:text-6xl">
                  {products.length.toString().padStart(2, '0')}
                </p>
                <p className="mt-1 text-sm text-slate-300">launch products in focus</p>
              </div>
              <div className="mt-7 flex items-center gap-2 text-xs text-slate-300">
                <Stethoscope className="h-4 w-4 text-teal-200" />
                Built for everyday clinical demand
              </div>
            </div>

            <div className="absolute right-0 top-8 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-xl md:right-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-200">Collection</p>
              <p className="mt-1 text-sm font-semibold">Gynae spotlight</p>
            </div>
            <div className="absolute bottom-8 left-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl md:left-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-200">Access</p>
              <p className="mt-1 text-sm font-semibold">B2B ordering ready</p>
            </div>
          </div>
        </div>
      </section>

      <section id="collection" className="container scroll-mt-24 py-16 md:py-24">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-primary text-xs font-semibold uppercase tracking-[0.22em]">
              The launch edit
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Five names. One clear point of view.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6 md:text-base">
              Product information at a glance, with full details one click away.
            </p>
          </div>
          <Link
            href="/products"
            className="text-primary group inline-flex items-center gap-2 text-sm font-semibold"
          >
            View all products
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground p-10 text-center text-sm">
              The spotlight collection is being updated. Please check back shortly.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <SpotlightCard key={product.slug} product={product} featured={index === 0} />
            ))}
          </div>
        )}
      </section>

      <section className="container pb-16 md:pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-slate-950 to-slate-900 p-8 text-white md:p-12">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-xl">
              <Badge className="mb-4 gap-1.5 border-teal-200/20 bg-white/10 text-teal-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Built for partners
              </Badge>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Bring the right range to your next order.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
                Sign in to see wholesale pricing and place an order, or speak with the Parshlo team
                about the launch collection.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button asChild className="bg-teal-300 text-slate-950 hover:bg-teal-200">
                <Link href="/auth/sign-in">Sign in to order</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/contact">Contact team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SpotlightCard({
  product,
  featured,
}: {
  product: Awaited<ReturnType<typeof listPublicProducts>>[number];
  featured: boolean;
}): JSX.Element {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group block ${featured ? 'md:col-span-2 lg:col-span-2' : ''}`}
    >
      <Card className="h-full overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
        <div
          className={`relative overflow-hidden border-b bg-white ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}
        >
          <ProductImage
            slug={product.slug}
            alt={product.name}
            imageUrls={product.imageUrls}
            className="h-full w-full transition-transform duration-700 group-hover:scale-105"
            iconClassName={featured ? 'h-20 w-20' : 'h-16 w-16'}
          />
          <Badge
            variant="outline"
            className="bg-background/85 absolute left-4 top-4 gap-1.5 backdrop-blur"
          >
            <Sparkles className="text-primary h-3 w-3" /> Spotlight
          </Badge>
        </div>
        <CardContent className={`${featured ? 'p-6 md:p-7' : 'p-5'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-primary text-[10px] font-semibold uppercase tracking-[0.2em]">
                {featured ? 'Featured launch' : 'Parshlo gynae'}
              </p>
              <h3
                className={`font-display mt-2 font-semibold tracking-tight ${featured ? 'text-2xl md:text-3xl' : 'text-xl'}`}
              >
                {product.name.toUpperCase()}
              </h3>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                {product.composition || 'Gynaecology portfolio product'}
              </p>
            </div>
            <ArrowUpRight className="text-primary mt-1 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-wider">
            <span>{product.form}</span>
            <span aria-hidden="true">·</span>
            <span>{product.packaging}</span>
            {product.prescriptionRequired ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                  <ShieldCheck className="h-3 w-3" /> Rx
                </span>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
