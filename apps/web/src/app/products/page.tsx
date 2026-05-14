import { Pill, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { listPublicProducts } from '@/lib/api/products';

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
        <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary">
          Public Catalog
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Therapeutic Portfolio
        </h1>
        <p className="mt-4 text-muted-foreground">
          Wholesale pricing, MOQ, and inventory levels are visible only to verified B2B accounts.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="mt-14 rounded-xl border bg-secondary/40 p-8 text-center text-muted-foreground">
          The catalog is being updated. Please check back shortly.
        </div>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="block">
              <Card className="h-full">
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{p.category}</Badge>
                    {p.prescriptionRequired ? (
                      <Badge variant="warning" className="gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Rx
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
                    <Pill className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm text-muted-foreground">{p.composition}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {p.form} · {p.packaging}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-14 rounded-xl border bg-secondary/40 p-6 text-center md:p-10">
        <h2 className="font-display text-xl font-semibold">Looking for wholesale pricing?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get approved as a B2B partner to unlock pricing, MOQ, and live stock for the full catalog.
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/register">Request B2B Access</Link>
        </Button>
      </div>
    </div>
  );
}
