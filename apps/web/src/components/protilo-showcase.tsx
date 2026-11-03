'use client';

import { type PublicProductView } from '@parshlo/types';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { ProductImage } from '@/components/product-image';

interface ProtiloShowcaseProps {
  products: PublicProductView[];
}

const easing = [0.2, 0, 0, 1] as const;

function variantName(product: PublicProductView): string {
  const name = product.name.toUpperCase();
  if (name.includes('PROTILO® - DM')) return 'Protilo DM';
  if (name.includes('PROTILO® - SF')) return 'Protilo SF';
  return 'Protilo';
}

function flavorName(product: PublicProductView): string {
  const name = product.name.toUpperCase();
  if (name.includes('KESAR')) return 'Kesar';
  if (name.includes('CHOCOLATE')) return 'Chocolate';
  return 'Protein powder';
}

export function ProtiloShowcase({ products }: ProtiloShowcaseProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const featured = products.at(0);
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
        <div className="container relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-4 py-[clamp(1rem,3svh,4rem)] text-center">
          <motion.p
            {...reveal()}
            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300"
          >
            The Protilo range
          </motion.p>
          <motion.h1
            {...reveal(0.07)}
            className="font-display mt-4 max-w-3xl text-balance text-[2.25rem] font-semibold leading-[1.06] tracking-[-0.045em] sm:text-[clamp(2.5rem,4.25vw,3.75rem)]"
          >
            Meet Protilo.
          </motion.h1>
          <motion.p
            {...reveal(0.14)}
            className="mt-4 max-w-[42rem] text-balance text-sm leading-6 text-[#52665d] sm:text-base sm:leading-7 dark:text-slate-300"
          >
            Explore every Protilo protein powder in the Parshlo catalog, from DM and SF to chocolate
            and kesar variants.
          </motion.p>
          <motion.div
            {...reveal(0.2)}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            <Link
              href="#range"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#176b56] px-6 text-sm font-medium text-white transition-colors hover:bg-[#10513f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b56] dark:bg-teal-300 dark:text-[#0b1513] dark:hover:bg-teal-200"
            >
              See the range <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#176b56] hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-teal-200"
            >
              All products <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
          {featured && (
            <motion.div
              initial={{ y: reducedMotion ? 0 : 28, scale: reducedMotion ? 1 : 0.96 }}
              animate={{ y: 0, scale: 1 }}
              transition={{
                duration: reducedMotion ? 0.2 : 0.95,
                delay: reducedMotion ? 0 : 0.2,
                ease: easing,
              }}
              className="mt-5 flex h-[clamp(150px,30svh,230px)] w-full max-w-[400px] items-center justify-center sm:mt-8 sm:h-[clamp(210px,40svh,360px)]"
            >
              <ProductImage
                slug={featured.slug}
                alt={`${featured.name} product packaging`}
                imageUrls={featured.imageUrls}
                priority
                className="h-full w-full rounded-xl bg-transparent object-contain p-2 shadow-[0_28px_55px_-42px_rgba(28,80,51,0.5)] sm:p-4"
                iconClassName="h-20 w-20"
              />
            </motion.div>
          )}
          {featured && (
            <motion.p
              {...reveal(0.25)}
              className="mt-4 text-xs font-medium text-[#667b70] dark:text-slate-400"
            >
              {variantName(featured)} <span aria-hidden="true">·</span> {flavorName(featured)}{' '}
              <span aria-hidden="true">·</span> {featured.packaging}
            </motion.p>
          )}
        </div>
      </section>

      <section
        id="range"
        className="container scroll-mt-20 px-4 py-20 sm:py-24 md:py-28"
        aria-labelledby="protilo-range-heading"
      >
        <motion.div {...reveal()} className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300">
            {products.length ? `${products.length} protein powders` : 'Protein powders'}
          </p>
          <h2
            id="protilo-range-heading"
            className="font-display mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl"
          >
            Find your Protilo.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-6 sm:text-base">
            Compare the variants, flavours, and pack sizes. Open a product for its full details.
          </p>
        </motion.div>

        {products.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {products.map((product, index) => (
              <motion.div
                key={product.slug}
                {...reveal(index % 2 ? 0.1 : 0)}
                className={index === products.length - 1 && index % 2 === 0 ? 'md:col-span-2' : ''}
              >
                <Link
                  href={`/products/${product.slug}`}
                  className="group flex min-h-[410px] flex-col items-center overflow-hidden rounded-[1.75rem] bg-[#f5f7f5] px-5 pb-7 pt-9 text-center transition-colors hover:bg-[#edf3ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b56] sm:min-h-[480px] sm:px-8 sm:pt-11 dark:bg-[#141e1b] dark:hover:bg-[#1a2923]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#39735d] dark:text-teal-300">
                    {flavorName(product)} protein powder
                  </p>
                  <h3 className="font-display mt-3 text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                    {variantName(product)}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {product.packaging}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#176b56] group-hover:underline dark:text-teal-200">
                    View product <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="mt-auto flex h-[215px] w-full max-w-[390px] items-end justify-center pt-7 sm:h-[265px]">
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
            The Protilo range is being updated. Please check back shortly.
          </p>
        )}
      </section>

      <section className="bg-[#eaf1eb] px-4 py-20 text-center sm:py-24 dark:bg-[#10211a]">
        <motion.div {...reveal()} className="container mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#176b56] dark:text-teal-300">
            For verified partners
          </p>
          <h2 className="font-display mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Add Protilo to your next order.
          </h2>
          <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
            Wholesale pricing and ordering are available after sign-in.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <Link
              href="/auth/sign-in"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#176b56] px-6 text-sm font-medium text-white transition-colors hover:bg-[#10513f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b56] dark:bg-teal-300 dark:text-[#0b1513] dark:hover:bg-teal-200"
            >
              Sign in to order <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#176b56] hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-teal-200"
            >
              Contact Parshlo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
