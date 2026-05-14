'use client';

import { type BuyerProductView } from '@parshlo/types';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { CartDrawer } from './cart-drawer';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart, totals } from '@/lib/cart-store';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { formatINR } from '@/lib/utils';

export function BuyerCatalog({
  products,
  accessToken,
}: {
  products: BuyerProductView[];
  accessToken: string;
}): JSX.Element {
  const cart = useCart();
  const { itemCount } = totals(cart.lines);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="bg-background/80 sticky top-20 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-3">
        <p className="text-muted-foreground text-sm">
          {products.length} products
          {PRICING_ENABLED ? ' · prices shown ex-GST' : ' · pricing coming soon'}
        </p>
        <Button onClick={() => setDrawerOpen(true)} size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Cart
          {itemCount > 0 ? <Badge className="text-primary ml-1 bg-white">{itemCount}</Badge> : null}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        accessToken={accessToken}
      />
    </>
  );
}

function ProductCard({ product }: { product: BuyerProductView }): JSX.Element {
  const cart = useCart();
  const inCart = cart.lines.find((l) => l.productId === product.id);
  const outOfStock = product.status === 'OUT_OF_STOCK' || product.availableQty <= 0;

  return (
    <Card className="h-full overflow-hidden">
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
      <CardContent className="space-y-3 p-4">
        <Badge variant="secondary">{product.category}</Badge>
        <div>
          <h3 className="font-display text-base font-semibold leading-tight">{product.name}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">{product.composition}</p>
        </div>
        <div className="space-y-2">
          <Field label="Wholesale" value={formatINR(product.wholesalePricePaise)} mono />
          <div className="grid grid-cols-2 gap-2">
            <Field label="MOQ" value={String(product.moq)} />
            <Field label="GST" value={`${product.gstRate}%`} />
          </div>
        </div>
        {outOfStock ? (
          <Button variant="outline" disabled className="w-full">
            Out of stock
          </Button>
        ) : inCart ? (
          <div className="flex items-center justify-between rounded-md border p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => cart.setQty(product.id, inCart.qty - product.moq)}
              disabled={inCart.qty <= product.moq}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-mono text-sm">{inCart.qty} units</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => cart.setQty(product.id, inCart.qty + product.moq)}
              disabled={inCart.qty + product.moq > product.availableQty}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button onClick={() => cart.add(product)} className="w-full">
            Add to cart · {product.moq}
          </Button>
        )}
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
