'use client';

import { type BuyerProductView } from '@parshlo/types';
import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AdminCartDrawer } from '@/components/admin/admin-cart-drawer';
import { AddToCartRow } from '@/components/cart/add-to-cart-row';
import { CartQuantityInput } from '@/components/cart/cart-quantity-input';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { totals, useAdminCart } from '@/lib/admin-cart-store';
import { type AdminBuyer, placeOrderOnBehalfFromBrowser } from '@/lib/api/admin';
import { UNLIMITED_CART_QTY } from '@/lib/cart-quantity';
import { PRICING_ENABLED } from '@/lib/feature-flags';
import { formatINR } from '@/lib/utils';

function buyerLabel(b: AdminBuyer): string {
  const business = b.businessName?.trim();
  const primary = business && business.length > 0 ? business : b.fullName;
  return `${primary} · ${b.email}`;
}

function canPlaceForBuyer(b: AdminBuyer): boolean {
  return b.accountStatus === 'APPROVED' && Boolean(b.gstin);
}

function priceTierForBusinessType(businessType?: string | null): BuyerProductView['priceTier'] {
  return businessType === 'PHARMACY' ? 'RATE_B' : 'RATE_A';
}

export function AdminPlaceOrderPanel({
  buyers,
  products,
}: {
  buyers: AdminBuyer[];
  products: BuyerProductView[];
}): JSX.Element {
  const router = useRouter();
  const cart = useAdminCart();
  const { itemCount } = totals(cart.lines);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buyerId, setBuyerId] = useState('');
  const [query, setQuery] = useState('');

  const sortedBuyers = useMemo(
    () =>
      [...buyers].sort((a, b) => {
        const aOk = canPlaceForBuyer(a);
        const bOk = canPlaceForBuyer(b);
        if (aOk !== bOk) {
          return aOk ? -1 : 1;
        }
        const aName = (a.businessName ?? a.fullName).toLowerCase();
        const bName = (b.businessName ?? b.fullName).toLowerCase();
        return aName.localeCompare(bName);
      }),
    [buyers],
  );

  const selectedBuyer = sortedBuyers.find((b) => b.id === buyerId) ?? null;
  const catalogEnabled = Boolean(selectedBuyer && canPlaceForBuyer(selectedBuyer));
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

  const onBuyerChange = (nextId: string): void => {
    setBuyerId(nextId);
    cart.clear();
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Place order for buyer</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose the buyer account this order will be billed to, then add products from the
              products below.
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Buyer</span>
            <select
              className="border-input bg-background flex h-11 w-full rounded-md border px-3 text-sm"
              value={buyerId}
              onChange={(e) => onBuyerChange(e.target.value)}
            >
              <option value="">Choose a buyer…</option>
              {sortedBuyers.map((b) => (
                <option key={b.id} value={b.id} disabled={!canPlaceForBuyer(b)}>
                  {buyerLabel(b)}
                  {!canPlaceForBuyer(b) ? ` (${b.accountStatus.replace(/_/g, ' ')})` : ''}
                </option>
              ))}
            </select>
          </label>
          {selectedBuyer ? (
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>
                Contact: <span className="text-foreground">{selectedBuyer.fullName}</span>
              </span>
              {selectedBuyer.gstin ? (
                <span>
                  GSTIN: <span className="text-foreground font-mono">{selectedBuyer.gstin}</span>
                </span>
              ) : null}
              <Badge variant={selectedBuyer.accountStatus === 'APPROVED' ? 'success' : 'warning'}>
                {selectedBuyer.accountStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              {buyers.length === 0
                ? 'No buyer accounts found.'
                : 'Select a buyer before adding products to the cart.'}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="bg-background/80 sticky top-20 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-3">
        <p className="text-muted-foreground text-sm">
          {countLabel}
          {PRICING_ENABLED ? ' · rates include GST' : ' · pricing coming soon'}
        </p>
        <Button
          onClick={() => setDrawerOpen(true)}
          size="sm"
          className="gap-2"
          disabled={!catalogEnabled}
        >
          <ShoppingCart className="h-4 w-4" />
          Cart
          {itemCount > 0 ? <Badge className="text-primary ml-1 bg-white">{itemCount}</Badge> : null}
        </Button>
      </div>

      {buyerId && !catalogEnabled ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          This buyer is not approved yet. Complete KYC before placing orders on their behalf.
        </div>
      ) : null}

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
            <AdminProductCard
              key={p.id}
              product={p}
              buyer={selectedBuyer}
              disabled={!catalogEnabled}
            />
          ))}
        </div>
      )}

      <AdminCartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        buyer={selectedBuyer}
        onCheckout={async ({ purchaseOrderNumber, notes }) => {
          if (!selectedBuyer) {
            throw new Error('Select a buyer before placing the order.');
          }
          const order = await placeOrderOnBehalfFromBrowser({
            buyerId: selectedBuyer.id,
            items: cart.lines.map((l) => ({
              productId: l.productId,
              quantity: l.qty,
              schemeFreeQuantity: l.schemeFreeQuantity ?? 0,
              discountPaise: l.discountPaise ?? 0,
              priceTier: l.priceTier,
            })),
            purchaseOrderNumber,
            notes,
          });
          cart.clear();
          setBuyerId('');
          setDrawerOpen(false);
          router.push(`/admin/orders/${order.id}`);
          router.refresh();
        }}
      />
    </>
  );
}

function AdminProductCard({
  product,
  buyer,
  disabled,
}: {
  product: BuyerProductView;
  buyer: AdminBuyer | null;
  disabled: boolean;
}): JSX.Element {
  const cart = useAdminCart();
  const inCart = cart.lines.find((l) => l.productId === product.id);
  const defaultTier = priceTierForBusinessType(buyer?.businessType);
  const defaultPrice = defaultTier === 'RATE_B' ? product.rateBPaise : product.rateAPaise;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden border-b">
        <ProductImage
          slug={product.slug}
          alt={product.name}
          className="h-full w-full"
          iconClassName="h-16 w-16"
        />
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display line-clamp-2 text-base font-semibold leading-tight">
          {product.name.toUpperCase()}
        </h3>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          {product.form} · {product.packaging}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatINR(defaultPrice)} · {defaultTier === 'RATE_B' ? 'Rate B (PTR)' : 'Rate A (PTS)'} ·
          GST Rate ({product.gstRate}%) included in price
        </p>
        <div className="mt-auto pt-1">
          {inCart ? (
            <CartQuantityInput
              qty={inCart.qty}
              maxQty={inCart.maxQty || UNLIMITED_CART_QTY}
              onQtyChange={(next) => cart.setQty(product.id, next)}
              disabled={disabled}
              className="w-full justify-center"
            />
          ) : (
            <AddToCartRow
              product={product}
              disabled={disabled}
              onAdd={(p, qty) => {
                cart.add({ ...p, wholesalePricePaise: defaultPrice, priceTier: defaultTier }, qty);
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
