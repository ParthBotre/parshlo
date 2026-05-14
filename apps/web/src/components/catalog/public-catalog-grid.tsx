'use client';

import { type PublicProductView } from '@parshlo/types';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { CatalogFilters } from './catalog-filters';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCatalogFilters } from '@/lib/use-catalog-filters';

export function PublicCatalogGrid({ products }: { products: PublicProductView[] }): JSX.Element {
  const filters = useCatalogFilters(products);
  const countLabel = filters.isFiltered
    ? `${filters.filteredProducts.length} of ${products.length} products`
    : `${products.length} products`;

  return (
    <div className="mt-12 space-y-6">
      <CatalogFilters
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        categories={filters.categories}
        selectedCategories={filters.selectedCategories}
        onToggleCategory={filters.toggleCategory}
        isFiltered={filters.isFiltered}
        onClear={filters.clearFilters}
      />

      <p className="text-muted-foreground text-xs">{countLabel}</p>

      {filters.filteredProducts.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          No products match your filters.
          {filters.isFiltered ? (
            <Button
              variant="link"
              onClick={filters.clearFilters}
              className="ml-1 h-auto p-0 text-sm"
            >
              Reset
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filters.filteredProducts.map((p) => (
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
                  <Badge variant="secondary" className="w-fit">
                    {p.category}
                  </Badge>
                  <h2 className="font-display line-clamp-2 text-lg font-semibold leading-tight">
                    {p.name}
                  </h2>
                  <p className="text-muted-foreground line-clamp-2 text-sm">{p.composition}</p>
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
