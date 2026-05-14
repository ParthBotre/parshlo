import { ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Product Catalog',
  description:
    'Browse the Parshlo therapeutic catalog. Wholesale pricing is reserved for verified B2B partners.',
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
          Public Catalog
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Therapeutic Portfolio
        </h1>
        <p className="text-muted-foreground mt-4">
          Wholesale pricing, MOQ, and inventory levels are visible only to verified B2B accounts.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-secondary/40 text-muted-foreground mt-14 rounded-xl border p-8 text-center">
          The catalog is being updated. Please check back shortly.
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="block">
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative aspect-square overflow-hidden border-b">
                  <ProductImage
                    slug={p.slug}
                    alt={p.name}
                    className="h-full w-full"
                    iconClassName="h-20 w-20"
                  />
                  {p.prescriptionRequired ? (
                    <Badge
                      variant="warning"
                      className="absolute right-3 top-3 gap-1 shadow-sm backdrop-blur"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Rx
                    </Badge>
                  ) : null}
                </div>
                <CardContent className="space-y-2 p-5">
                  <Badge variant="secondary">{p.category}</Badge>
                  <h2 className="font-display text-lg font-semibold leading-tight">{p.name}</h2>
                  <p className="text-muted-foreground text-sm">{p.composition}</p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    {p.form} · {p.packaging}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-secondary/40 mt-14 rounded-xl border p-6 text-center md:p-10">
        <h2 className="font-display text-xl font-semibold">Looking for wholesale pricing?</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Get approved as a B2B partner to unlock pricing, MOQ, and live stock for the full catalog.
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/register">Request B2B Access</Link>
        </Button>
      </div>
    </div>
  );
}
