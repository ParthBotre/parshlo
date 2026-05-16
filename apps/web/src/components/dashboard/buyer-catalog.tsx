'use client';

import { type BuyerProductView } from '@parshlo/types';
import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { CartDrawer } from './cart-drawer';

import { AddToCartRow } from '@/components/cart/add-to-cart-row';
import { CartQuantityInput } from '@/components/cart/cart-quantity-input';
import { CatalogFilters } from '@/components/catalog/catalog-filters';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { totals, useCart } from '@/lib/cart-store';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { useCatalogFilters } from '@/lib/use-catalog-filters';
import { formatINR } from '@/lib/utils';

export function BuyerCatalog({ products }: { products: BuyerProductView[] }): JSX.Element {
  const cart = useCart();
  const { itemCount } = totals(cart.lines);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const filters = useCatalogFilters(products);
  const countLabel = filters.isFiltered
    ? `${filters.filteredProducts.length} of ${products.length} products`
    : `${products.length} products`;

  return (
    <>
      <div className="bg-background/80 sticky top-20 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-3">
        <p className="text-muted-foreground text-sm">
          {countLabel}
          {PRICING_ENABLED ? ' · prices shown ex-GST' : ' · pricing coming soon'}
        </p>
        <Button onClick={() => setDrawerOpen(true)} size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Cart
          {itemCount > 0 ? <Badge className="text-primary ml-1 bg-white">{itemCount}</Badge> : null}
        </Button>
      </div>

      <div className="mb-4">
        <CatalogFilters
          searchQuery={filters.searchQuery}
          onSearchChange={filters.setSearchQuery}
          categories={filters.categories}
          selectedCategories={filters.selectedCategories}
          onToggleCategory={filters.toggleCategory}
          isFiltered={filters.isFiltered}
          onClear={filters.clearFilters}
        />
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filters.filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

function ProductCard({ product }: { product: BuyerProductView }): JSX.Element {
  const cart = useCart();
  const inCart = cart.lines.find((l) => l.productId === product.id);
  const outOfStock = product.status === 'OUT_OF_STOCK' || product.availableQty <= 0;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden border-b">
        <ProductImage
          slug={product.slug}
          alt={product.name}
          className="h-full w-full"
          iconClassName="h-16 w-16"
        />
        <Badge
          variant={product.prescriptionRequired ? 'warning' : 'success'}
          className="absolute right-3 top-3 shadow-sm backdrop-blur"
        >
          {product.prescriptionRequired ? 'Rx' : 'OTC'}
        </Badge>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <Badge variant="secondary" className="w-fit">
          {product.category}
        </Badge>
        <div>
          <h3 className="font-display line-clamp-2 text-base font-semibold leading-tight">
            {product.name}
          </h3>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{product.composition}</p>
        </div>
        <div className="space-y-2">
          <Field label="Wholesale" value={formatINR(product.wholesalePricePaise)} mono />
          <Field label="GST" value={`${product.gstRate}%`} />
        </div>
        <div className="mt-auto pt-1">
          {outOfStock ? (
            <Button variant="outline" disabled className="w-full">
              Out of stock
            </Button>
          ) : inCart ? (
            <CartQuantityInput
              qty={inCart.qty}
              maxQty={inCart.maxQty || product.availableQty}
              onQtyChange={(next) => cart.setQty(product.id, next)}
              className="w-full justify-center"
            />
          ) : (
            <AddToCartRow product={product} onAdd={(p, qty) => cart.add(p, qty)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  mono = false,
  muted = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}): JSX.Element {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</p>
      <p
        className={`text-xs font-medium ${mono ? 'font-mono' : ''} ${muted ? 'text-muted-foreground' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
