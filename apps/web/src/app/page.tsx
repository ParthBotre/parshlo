import { ArrowRight, ArrowUpRight, PackageCheck, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { ProductImage } from '@/components/product-image';
import { Button } from '@/components/ui/button';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';
import { latestProducts } from '@/lib/latest-products';

export const metadata: Metadata = {
  title: 'Latest products',
  description: 'Discover the newest additions to the Parshlo pharmaceutical portfolio.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];
  try {
    products = await listPublicProducts({ cache: 'no-store' });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  const spotlight = latestProducts(products);
  const lead = spotlight.at(0);
  const more = spotlight.slice(1);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#d9e9df] bg-[#eef5ee] text-[#102823] dark:border-white/10 dark:bg-[#0b1917] dark:text-white">
        <div className="pointer-events-none absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full border border-[#a8d6c3]/50 dark:border-teal-300/10" />
        <div className="pointer-events-none absolute -right-4 -top-20 h-[27rem] w-[27rem] rounded-full border border-[#a8d6c3]/60 dark:border-teal-300/10" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(104,194,151,0.18),transparent_38%)] dark:bg-[radial-gradient(circle_at_78%_18%,rgba(45,212,191,0.11),transparent_40%)]" />

        <div className="container relative grid gap-10 py-12 md:min-h-[620px] md:grid-cols-[0.92fr_1.08fr] md:items-center md:gap-14 md:py-20">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300">
              <span className="h-2 w-2 rounded-full bg-[#21a67b] shadow-[0_0_0_6px_rgba(33,166,123,0.12)]" />
              The latest from Parshlo
            </div>
            {lead ? (
              <>
                <p className="mb-3 text-sm font-medium text-[#45675c] dark:text-teal-100/70">
                  A new addition to the portfolio
                </p>
                <h1 className="font-display max-w-2xl text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-6xl lg:text-[5.5rem]">
                  {lead.name}
                </h1>
                <p className="mt-7 max-w-lg text-base leading-7 text-[#4f6860] md:text-lg dark:text-slate-300">
                  {lead.composition || lead.description}
                </p>
                <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#285c4d] dark:text-teal-100/80">
                  <span className="rounded-full border border-[#a9cdbd] px-4 py-2 dark:border-white/20">
                    {lead.form}
                  </span>
                  <span className="rounded-full border border-[#a9cdbd] px-4 py-2 dark:border-white/20">
                    {lead.packaging}
                  </span>
                </div>
                <div className="mt-9 flex flex-wrap items-center gap-5">
                  <Button
                    asChild
                    size="xl"
                    className="bg-[#125741] text-white hover:bg-[#0b4433] dark:bg-teal-300 dark:text-slate-950 dark:hover:bg-teal-200"
                  >
                    <Link href={`/products/${lead.slug}`}>
                      Explore this product <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#195c49] hover:text-[#0b382b] dark:text-teal-200 dark:hover:text-white"
                  >
                    View all products <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-display text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.06em] md:text-7xl">
                  Discover the Parshlo portfolio.
                </h1>
                <p className="mt-7 max-w-lg text-lg leading-7 text-[#4f6860] dark:text-slate-300">
                  Product information is being updated. Explore the catalog for available details.
                </p>
                <Button asChild size="xl" className="mt-9">
                  <Link href="/products">
                    Explore products <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-[620px]">
            <div className="absolute -inset-5 rounded-[2.75rem] border border-[#b8d9c8]/70 dark:border-teal-200/10" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[#dcebe1] p-3 shadow-[0_32px_80px_-40px_rgba(22,77,54,0.45)] sm:p-5 dark:border-white/10 dark:bg-[#16322b]">
              <div className="relative aspect-[1.1/1] overflow-hidden rounded-[1.5rem] bg-white">
                {lead ? (
                  <ProductImage
                    slug={lead.slug}
                    alt={lead.name}
                    imageUrls={lead.imageUrls}
                    priority
                    className="h-full w-full p-7 sm:p-10"
                    iconClassName="h-24 w-24"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#83bca1]">
                    <PackageCheck className="h-24 w-24" strokeWidth={1} />
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-full border border-[#dce9df] bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1c634a] backdrop-blur sm:left-6 sm:top-6">
                  Product spotlight
                </span>
              </div>
              <div className="flex items-end justify-between gap-4 px-2 pb-1 pt-5 sm:px-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#39705c] dark:text-teal-200/70">
                    Parshlo / latest addition
                  </p>
                  <p className="font-display mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                    {lead?.name ?? 'The Parshlo collection'}
                  </p>
                </div>
                <span className="font-display text-3xl font-light text-[#73a48c] dark:text-teal-200/50">
                  01
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24" aria-labelledby="latest-products-heading">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-primary text-[11px] font-bold uppercase tracking-[0.24em]">
              Fresh in the catalog
            </p>
            <h2
              id="latest-products-heading"
              className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl"
            >
              More to discover.
            </h2>
          </div>
          <Link
            href="/products"
            className="text-primary inline-flex items-center gap-2 text-sm font-semibold hover:underline"
          >
            Browse the full portfolio <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        {more.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="border-border/70 bg-card hover:border-primary/40 focus-visible:ring-primary group overflow-hidden rounded-[1.75rem] border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <div className="relative aspect-[1.35/1] overflow-hidden bg-white p-4">
                  <ProductImage
                    slug={product.slug}
                    alt={product.name}
                    imageUrls={product.imageUrls}
                    className="h-full w-full"
                    iconClassName="h-14 w-14"
                  />
                  <span className="absolute left-5 top-5 rounded-full bg-[#edf5ee] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1d664e]">
                    New addition
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3 p-6">
                  <div className="min-w-0">
                    <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.18em]">
                      {product.form} · {product.packaging}
                    </p>
                    <h3 className="font-display mt-2 text-xl font-semibold tracking-tight">
                      {product.name}
                    </h3>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">
                      {product.composition}
                    </p>
                  </div>
                  <span className="text-primary border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground border-border rounded-3xl border border-dashed p-10 text-center text-sm">
            The latest products will appear here as the catalog is updated.
          </div>
        )}
      </section>

      <section className="border-border/60 dark:bg-card/40 border-y bg-[#f6f8f5]">
        <div className="container grid gap-9 py-16 md:grid-cols-[1fr_auto] md:items-center md:py-20">
          <div className="max-w-2xl">
            <p className="text-primary text-[11px] font-bold uppercase tracking-[0.24em]">
              The complete range
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              Every product, in one place.
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-7">
              Explore compositions, strengths, pack formats, and prescription information before
              reaching out to order.
            </p>
          </div>
          <Button asChild size="xl">
            <Link href="/products">
              See {products.length ? `all ${products.length}` : 'all'} products{' '}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="container py-16 md:py-20">
        <div className="flex flex-col gap-7 rounded-[2rem] bg-[#103c32] p-8 text-white sm:p-10 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-200">
              <ShieldCheck className="h-4 w-4" /> For verified B2B partners
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Ready to bring these products into your next order?
            </h2>
            <p className="mt-3 text-sm leading-6 text-teal-50/75">
              Product details are public. Wholesale pricing and ordering are available after
              sign-in.
            </p>
          </div>
          <Link
            href="/auth/sign-in"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[#103c32] transition-colors hover:bg-teal-100"
          >
            Sign in to order <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
