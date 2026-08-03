'use client';

import { type BuyerProductView } from '@parshlo/types';
import { useMemo, useState } from 'react';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function AdminCatalogGrid({ products }: { products: BuyerProductView[] }): JSX.Element {
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
      ? `${products.length} SKUs`
      : `${visibleProducts.length} of ${products.length} SKUs`;

  return (
    <div className="space-y-4">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((p) => {
            return (
              <Card key={p.id} className="flex h-full flex-col overflow-hidden">
                <div className="relative aspect-square overflow-hidden border-b">
                  <ProductImage
                    slug={p.slug}
                    alt={p.name}
                    className="h-full w-full"
                    iconClassName="h-16 w-16"
                  />
                  <Badge
                    variant={
                      p.status === 'ACTIVE'
                        ? 'success'
                        : p.status === 'DRAFT'
                          ? 'warning'
                          : 'destructive'
                    }
                    className="absolute right-3 top-3 shadow-sm backdrop-blur"
                  >
                    {p.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="font-display line-clamp-2 text-base font-semibold leading-tight">
                      {p.name.toUpperCase()}
                    </h3>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-1 text-xs">
                    <Field label="Form" value={p.form} />
                    <Field label="Pack" value={p.packaging} />
                    <Field label="GST Rate" value={`${p.gstRate}% included`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}): JSX.Element {
  const valueClass =
    tone === 'danger'
      ? 'text-destructive font-semibold'
      : tone === 'warning'
        ? 'text-amber-600 font-semibold'
        : '';
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}
