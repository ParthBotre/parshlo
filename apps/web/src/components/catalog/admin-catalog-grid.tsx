'use client';

import { type BuyerProductView } from '@parshlo/types';

import { CatalogFilters } from './catalog-filters';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCatalogFilters } from '@/lib/use-catalog-filters';

export function AdminCatalogGrid({ products }: { products: BuyerProductView[] }): JSX.Element {
  const filters = useCatalogFilters(products);
  const countLabel = filters.isFiltered
    ? `${filters.filteredProducts.length} of ${products.length} SKUs`
    : `${products.length} SKUs`;

  return (
    <div className="space-y-4">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filters.filteredProducts.map((p) => {
            const isLow = p.availableQty <= 200;
            const isOut = p.status === 'OUT_OF_STOCK' || p.availableQty <= 0;
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
                  <Badge variant="secondary" className="w-fit">
                    {p.category}
                  </Badge>
                  <div>
                    <h3 className="font-display line-clamp-2 text-base font-semibold leading-tight">
                      {p.name}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {p.composition}
                    </p>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-1 text-xs">
                    <Field label="Form" value={p.form} />
                    <Field label="GST" value={`${p.gstRate}%`} />
                    <Field
                      label="Stock"
                      value={String(p.availableQty)}
                      tone={isOut ? 'danger' : isLow ? 'warning' : 'default'}
                    />
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
