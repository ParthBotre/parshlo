import { type Metadata } from 'next';
import Link from 'next/link';

import { PublicCatalogGrid } from '@/components/catalog/public-catalog-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Browse Parshlo therapeutic products. Wholesale pricing is reserved for verified B2B partners.',
};

// ISR every 5 minutes — public catalog changes rarely; static for speed, fresh on push.
export const revalidate = 300;

export default async function ProductsPage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>>;
  try {
    products = await listPublicProducts({ next: { revalidate: 300 } });
  } catch (err) {
    if (err instanceof ApiError) {
      products = [];
    } else {
      throw err;
    }
  }

  return (
    <div className="container py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary mb-4">
          Products
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Therapeutic Portfolio
        </h1>
        <p className="text-muted-foreground mt-4">
          Wholesale pricing and inventory levels are visible only to verified B2B accounts.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-secondary/40 text-muted-foreground mt-14 rounded-xl border p-8 text-center">
          Products are being updated. Please check back shortly.
        </div>
      ) : (
        <PublicCatalogGrid products={products} />
      )}

      <div className="bg-secondary/40 mt-14 rounded-xl border p-6 text-center md:p-10">
        <h2 className="font-display text-xl font-semibold">Looking for wholesale pricing?</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Get approved as a B2B partner to unlock pricing and live stock for all products.
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/register">Request B2B Access</Link>
        </Button>
      </div>
    </div>
  );
}
