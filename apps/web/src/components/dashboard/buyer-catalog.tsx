'use client';

import { Minus, Pill, Plus, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { type BuyerProductView } from '@parshlo/types';

import { CartDrawer } from './cart-drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart, totals } from '@/lib/cart-store';
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
      <div className="sticky top-20 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-3">
        <p className="text-sm text-muted-foreground">
          {products.length} products · prices shown ex-GST
        </p>
        <Button onClick={() => setDrawerOpen(true)} size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Cart
          {itemCount > 0 ? (
            <Badge className="ml-1 bg-white text-primary">{itemCount}</Badge>
          ) : null}
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
    <Card className="h-full">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{product.category}</Badge>
          {product.prescriptionRequired ? (
            <Badge variant="warning">Rx</Badge>
          ) : (
            <Badge variant="success">OTC</Badge>
          )}
        </div>
        <div className="flex h-28 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
          <Pill className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold leading-tight">{product.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{product.composition}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Wholesale" value={formatINR(product.wholesalePricePaise)} mono />
          <Field label="MRP" value={formatINR(product.mrpPaise)} mono muted />
          <Field label="MOQ" value={String(product.moq)} />
          <Field label="GST" value={`${product.gstRate}%`} />
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
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`text-xs font-medium ${mono ? 'font-mono' : ''} ${muted ? 'text-muted-foreground' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
