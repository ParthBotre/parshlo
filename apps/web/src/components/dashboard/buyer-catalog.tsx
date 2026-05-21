'use client';

import { type BuyerProductView } from '@parshlo/types';
import { ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CartDrawer } from './cart-drawer';

import { AddToCartRow } from '@/components/cart/add-to-cart-row';
import { CartQuantityInput } from '@/components/cart/cart-quantity-input';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UNLIMITED_CART_QTY } from '@/lib/cart-quantity';
import { totals, useCart } from '@/lib/cart-store';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { formatINR } from '@/lib/utils';

export function BuyerCatalog({ products }: { products: BuyerProductView[] }): JSX.Element {
  const cart = useCart();
  const { itemCount } = totals(cart.lines);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    <>
      <div className="bg-background/80 sticky top-20 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-3">
        <p className="text-muted-foreground text-sm">
          {countLabel}
          {PRICING_ENABLED ? ' · rates include GST' : ' · pricing coming soon'}
        </p>
        <Button onClick={() => setDrawerOpen(true)} size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Cart
          {itemCount > 0 ? <Badge className="text-primary ml-1 bg-white">{itemCount}</Badge> : null}
        </Button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder="Search products..."
        className="border-input bg-background placeholder:text-muted-foreground focus:border-primary mb-4 h-11 w-full rounded-md border px-3 text-base outline-none transition-colors sm:text-sm"
      />

      {visibleProducts.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          No products match your search.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((p) => (
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
        <div>
          <h3 className="font-display line-clamp-2 text-base font-semibold leading-tight">
            {product.name.toUpperCase()}
          </h3>
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {product.form} · {product.packaging}
          </p>
          <Field
            label={product.priceTier === 'RATE_B' ? 'Rate B (PTR)' : 'Rate A (PTS)'}
            value={formatINR(product.wholesalePricePaise)}
            mono
          />
          <Field label="GST Rate" value={`${product.gstRate}% included in price`} />
        </div>
        <div className="mt-auto pt-1">
          {inCart ? (
            <CartQuantityInput
              qty={inCart.qty}
              maxQty={inCart.maxQty || UNLIMITED_CART_QTY}
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
