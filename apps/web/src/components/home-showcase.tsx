'use client';

import { type PublicProductView } from '@parshlo/types';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { ProductImage } from '@/components/product-image';

interface HomeShowcaseProps {
  spotlight: PublicProductView[];
  productCount: number;
}

const easing = [0.2, 0, 0, 1] as const;

export function HomeShowcase({ spotlight, productCount }: HomeShowcaseProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const lead = spotlight.at(0);
  const more = spotlight.slice(1);
  const reveal = (delay = 0) => ({
    initial: { y: reducedMotion ? 0 : 24 },
    whileInView: { y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reducedMotion ? 0.2 : 0.7, delay, ease: easing },
  });

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#f7faf7] text-[#172b26] dark:bg-[#0b1513] dark:text-white">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_85%,rgba(133,193,155,0.24),transparent_58%)] dark:bg-[radial-gradient(ellipse_at_50%_85%,rgba(36,122,98,0.22),transparent_58%)]" />
        <div className="container relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 py-[clamp(1.25rem,3.5svh,4rem)] text-center">
          <motion.p
            {...reveal()}
            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300"
          >
            New to Parshlo
          </motion.p>
          <motion.h1
            {...reveal(0.07)}
            className="font-display mt-4 max-w-4xl text-balance text-[clamp(2.25rem,4.25vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.045em]"
          >
            {lead?.name ?? 'Discover the Parshlo portfolio.'}
          </motion.h1>
          <motion.p
            {...reveal(0.14)}
            className="mt-4 max-w-[42rem] text-balance text-sm leading-6 text-[#52665d] sm:text-base sm:leading-7 dark:text-slate-300"
          >
            {lead?.composition ?? lead?.description ?? 'Explore our complete pharmaceutical range.'}
          </motion.p>
          <motion.div
            {...reveal(0.2)}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {lead && (
              <Link
                href={`/products/${lead.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#176b56] px-6 text-sm font-medium text-white transition-colors hover:bg-[#10513f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b56] dark:bg-teal-300 dark:text-[#0b1513] dark:hover:bg-teal-200"
              >
                Explore product <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#176b56] hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-teal-200"
            >
              View all products <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
          <motion.div
            initial={{ y: reducedMotion ? 0 : 32, scale: reducedMotion ? 1 : 0.96 }}
            animate={{ y: 0, scale: 1 }}
            transition={{
              duration: reducedMotion ? 0.2 : 0.95,
              delay: reducedMotion ? 0 : 0.2,
              ease: easing,
            }}
            className="relative mt-5 flex h-[clamp(110px,26svh,230px)] w-full max-w-[620px] items-center justify-center sm:mt-8 sm:h-[clamp(190px,39svh,330px)] md:h-[clamp(200px,42svh,370px)] md:max-w-[min(620px,70vw)]"
          >
            {lead && (
              <ProductImage
                slug={lead.slug}
                alt={`${lead.name} product packaging`}
                imageUrls={lead.imageUrls}
                priority
                className="h-full w-full rounded-xl bg-transparent object-contain p-2 shadow-[0_28px_55px_-42px_rgba(28,80,51,0.5)] sm:p-5"
                iconClassName="h-20 w-20"
              />
            )}
          </motion.div>
          {lead && (
            <motion.p
              {...reveal(0.25)}
              className="mt-4 text-xs font-medium text-[#667b70] dark:text-slate-400"
            >
              {lead.form} <span aria-hidden="true">·</span> {lead.packaging}
            </motion.p>
          )}
        </div>
      </section>

      <section
        className="container px-4 py-20 sm:py-24 md:py-28"
        aria-labelledby="latest-products-heading"
      >
        <motion.div {...reveal()} className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300">
            Just added
          </p>
          <h2
            id="latest-products-heading"
            className="font-display mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl"
          >
            More to explore.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-6 sm:text-base">
            A closer look at the newest products in our portfolio.
          </p>
        </motion.div>
        {more.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {more.map((product, index) => (
              <motion.div
                key={product.slug}
                {...reveal(index % 2 ? 0.1 : 0)}
                className={index === 2 ? 'md:col-span-2' : ''}
              >
                <Link
                  href={`/products/${product.slug}`}
                  className="group flex min-h-[410px] flex-col items-center overflow-hidden rounded-[1.75rem] bg-[#f5f7f5] px-5 pb-7 pt-9 text-center transition-colors hover:bg-[#edf3ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b56] sm:min-h-[480px] sm:px-8 sm:pt-11 dark:bg-[#141e1b] dark:hover:bg-[#1a2923]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39735d] dark:text-teal-300">
                    Latest product
                  </p>
                  <h3 className="font-display mt-3 text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                    {product.name}
                  </h3>
                  <p className="text-muted-foreground mt-2 max-w-md text-balance text-sm leading-6">
                    {product.composition || product.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#176b56] group-hover:underline dark:text-teal-200">
                    Explore <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="mt-auto flex h-[205px] w-full max-w-[430px] items-end justify-center pt-7 sm:h-[250px]">
                    <ProductImage
                      slug={product.slug}
                      alt={`${product.name} product packaging`}
                      imageUrls={product.imageUrls}
                      className="h-full w-full rounded-lg bg-transparent object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.025] sm:p-4"
                      iconClassName="h-16 w-16"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-12 text-center text-sm">
            The latest products will appear here as the catalog is updated.
          </p>
        )}
      </section>

      <section className="bg-[#eaf1eb] px-4 py-20 text-center sm:py-24 dark:bg-[#10211a]">
        <motion.div {...reveal()} className="container mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300">
            The complete range
          </p>
          <h2 className="font-display mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl">
            Find the right product.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
            Explore compositions, strengths, and pack formats across the full Parshlo portfolio.
          </p>
          <Link
            href="/products"
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#176b56] px-6 text-sm font-medium text-white transition-colors hover:bg-[#10513f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b56] dark:bg-teal-300 dark:text-[#0b1513] dark:hover:bg-teal-200"
          >
            Browse {productCount ? `all ${productCount}` : 'all'} products{' '}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </section>

      <section className="container px-4 py-20 text-center sm:py-24">
        <motion.div {...reveal()} className="mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300">
            For verified partners
          </p>
          <h2 className="font-display mt-4 text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            Ready to order?
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6 sm:text-base">
            Wholesale pricing and ordering are available after sign-in.
          </p>
          <Link
            href="/auth/sign-in"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#176b56] hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-teal-200"
          >
            Sign in to order <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </motion.div>
      </section>
    </>
  );
}
