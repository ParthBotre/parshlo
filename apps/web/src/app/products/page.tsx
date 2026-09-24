import { type Metadata } from 'next';
import Link from 'next/link';

import { PublicCatalogGrid } from '@/components/catalog/public-catalog-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Browse the Parshlo therapeutic product portfolio, including product forms, packaging, and prescription status.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductsPage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>>;
  try {
    products = await listPublicProducts({ cache: 'no-store' });
  } catch (err) {
    if (err instanceof ApiError) {
      products = [];
    } else {
      throw err;
    }
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.2),transparent_38%),linear-gradient(120deg,#020617,#0f172a_62%,#042f2e)]" />
        <div className="container relative py-14 md:py-20">
          <div className="max-w-3xl">
            <Badge className="mb-5 border-teal-300/25 bg-teal-300/10 text-teal-200">
              Parshlo product library
            </Badge>
            <h1 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">
              Know the product before you place the order.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Browse forms, compositions, packaging, prescription status, and marketed-by details
              across the Parshlo therapeutic portfolio.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="bg-teal-300 text-slate-950 hover:bg-teal-200">
                <Link href="/gynae-spotlight">Explore Gynae Spotlight</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/auth/sign-in">Sign in to order</Link>
              </Button>
            </div>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Public', 'product details'],
              ['B2B', 'ordering access'],
              ['Clear', 'pack information'],
              ['India', 'partner network'],
            ].map(([value, label]) => (
              <div
                key={value}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <p className="font-display text-xl font-semibold text-teal-200">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary mb-4">
            Full portfolio
          </Badge>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Therapeutic portfolio
          </h2>
          <p className="text-muted-foreground mt-4">
            Search the range by product name and open any SKU for its complete public profile.
          </p>
        </div>

        {products.length === 0 ? (
          <Card className="mt-14 border-dashed">
            <CardContent className="text-muted-foreground p-8 text-center">
              Products are being updated. Please check back shortly.
            </CardContent>
          </Card>
        ) : (
          <PublicCatalogGrid products={products} />
        )}
      </section>
    </div>
  );
}
