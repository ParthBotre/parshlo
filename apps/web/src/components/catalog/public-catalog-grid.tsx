'use client';

import { type PublicProductView } from '@parshlo/types';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function PublicCatalogGrid({ products }: { products: PublicProductView[] }): JSX.Element {
  const [query, setQuery] = useState('');
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return products;
    }
    return products.filter((product) => product.name.toLowerCase().includes(needle));
  }, [products, query]);
  const countLabel =
    visibleProducts.length === products.length
      ? `${products.length} products`
      : `${visibleProducts.length} of ${products.length} products`;

  return (
    <div className="mt-12 space-y-6">
      <input
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Search products..."
        className="border-input bg-background placeholder:text-muted-foreground focus:border-primary h-11 w-full rounded-md border px-3 text-base outline-none transition-colors sm:text-sm"
      />
      <p className="text-muted-foreground text-xs">{countLabel}</p>

      {visibleProducts.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          No products match your search.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="block">
              <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
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
                <CardContent className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="font-display line-clamp-2 text-lg font-semibold leading-tight">
                    {p.name.toUpperCase()}
                  </h2>
                  <p className="text-muted-foreground mt-auto line-clamp-1 pt-1 text-xs uppercase tracking-wider">
                    {p.form} · {p.packaging}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
