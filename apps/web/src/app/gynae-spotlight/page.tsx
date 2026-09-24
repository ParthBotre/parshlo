import { ArrowRight, BadgeCheck, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
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

function isSpotlightProduct(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return SPOTLIGHT_NAMES.some((spotlightName) => normalized.includes(spotlightName));
}

export default async function GynaeSpotlightPage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];
  try {
    products = (await listPublicProducts({ cache: 'no-store' })).filter((product) =>
      isSpotlightProduct(product.name),
    );
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <div className="min-h-screen">
      <section className="grid-hero relative overflow-hidden border-b">
        <div className="grid-noise absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl">
            <Badge className="border-primary/20 bg-primary/10 text-primary mb-5 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              New launch portfolio
            </Badge>
            <h1 className="font-display text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Gynae care, brought into focus.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 md:text-lg">
              Meet the Parshlo-specific gynaecology range built for dependable distribution and
              everyday clinical demand. Explore the launch collection below.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/products">
                  Browse full portfolio <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Talk to our team</Link>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid max-w-2xl gap-3 sm:grid-cols-3">
            <div className="glass rounded-2xl p-4">
              <HeartPulse className="text-primary h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">Focused care</p>
              <p className="text-muted-foreground mt-1 text-xs">Gynaecology-led selection</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <ShieldCheck className="text-primary h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">Trusted details</p>
              <p className="text-muted-foreground mt-1 text-xs">Clear forms and packaging</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <BadgeCheck className="text-primary h-5 w-5" />
              <p className="mt-3 text-sm font-semibold">B2B ready</p>
              <p className="text-muted-foreground mt-1 text-xs">Wholesale access on sign-in</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">
              Parshlo specific
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Launch collection
            </h2>
          </div>
          <span className="text-muted-foreground text-sm">{products.length} products</span>
        </div>

        {products.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground p-10 text-center text-sm">
              The spotlight collection is being updated. Please check back shortly.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link key={product.slug} href={`/products/${product.slug}`} className="group block">
                <Card className="h-full overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden border-b bg-white">
                    <ProductImage
                      slug={product.slug}
                      alt={product.name}
                      imageUrls={product.imageUrls}
                      className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                      iconClassName="h-16 w-16"
                    />
                    <Badge
                      variant="outline"
                      className="bg-background/80 absolute left-4 top-4 backdrop-blur"
                    >
                      Gynae spotlight
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-xl font-semibold tracking-tight">
                          {product.name.toUpperCase()}
                        </h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                          {product.composition || 'Gynaecology portfolio product'}
                        </p>
                      </div>
                      <ArrowRight className="text-primary mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="text-muted-foreground mt-5 flex flex-wrap gap-x-3 gap-y-1 text-xs uppercase tracking-wider">
                      <span>{product.form}</span>
                      <span aria-hidden="true">·</span>
                      <span>{product.packaging}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
