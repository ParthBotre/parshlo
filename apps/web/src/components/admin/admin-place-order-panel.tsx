'use client';

import { type BuyerProductView } from '@parshlo/types';
import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AdminCartDrawer } from '@/components/admin/admin-cart-drawer';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { totals, useAdminCart } from '@/lib/admin-cart-store';
import { type AdminBuyer, placeOrderOnBehalfFromBrowser } from '@/lib/api/admin';
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
  return businessType === 'CHEMIST' ? 'RATE_B' : 'RATE_A';
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
  const [buyerQuery, setBuyerQuery] = useState('');
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
  const buyerSearchResults = useMemo(() => {
    const needle = buyerQuery.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return sortedBuyers
      .filter((b) =>
        [b.businessName, b.fullName, b.email, b.gstin, b.mobile, b.city, b.state, b.businessType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      )
      .slice(0, 8);
  }, [buyerQuery, sortedBuyers]);
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

  const selectBuyerFromSearch = (buyer: AdminBuyer): void => {
    if (!canPlaceForBuyer(buyer)) {
      return;
    }
    onBuyerChange(buyer.id);
    setBuyerQuery(buyerLabel(buyer));
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
            <input
              value={buyerQuery}
              onChange={(event) => setBuyerQuery(event.currentTarget.value)}
              placeholder="Search buyer by business, contact, GSTIN, city..."
              className="border-input bg-background placeholder:text-muted-foreground focus:border-primary h-11 w-full rounded-md border px-3 text-base outline-none transition-colors sm:text-sm"
            />
            {buyerQuery.trim().length > 0 ? (
              <div className="bg-background overflow-hidden rounded-md border">
                {buyerSearchResults.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-2 text-sm">No matching buyers.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {buyerSearchResults.map((b) => {
                      const disabled = !canPlaceForBuyer(b);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => selectBuyerFromSearch(b)}
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                            buyerId === b.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-accent text-foreground'
                          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          <span className="font-medium">{buyerLabel(b)}</span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            {b.city ? `${b.city} · ` : ''}
                            {b.gstin ?? 'No GSTIN'}
                            {disabled ? ` · ${b.accountStatus.replace(/_/g, ' ')}` : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
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
        onCheckout={async ({ notes }) => {
          if (!selectedBuyer) {
            throw new Error('Select a buyer before placing the order.');
          }
          const order = await placeOrderOnBehalfFromBrowser({
            buyerId: selectedBuyer.id,
            items: cart.lines.map((l) => ({
              productId: l.productId,
              quantity: l.qty,
              schemeFreeQuantity: l.schemeFreeQuantity ?? 0,
              discountPaise: 0,
              priceTier: l.priceTier,
            })),
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
  const [paidQty, setPaidQty] = useState('1');
  const [freeQty, setFreeQty] = useState('0');
  const paidQtyValue = inCart ? String(inCart.qty) : paidQty;
  const freeQtyValue = inCart ? String(inCart.schemeFreeQuantity ?? 0) : freeQty;

  const parseQty = (value: string): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  };
  const currentPaidQty = parseQty(paidQtyValue);
  const currentFreeQty = parseQty(freeQtyValue);
  const canAdd = !disabled && (currentPaidQty > 0 || currentFreeQty > 0);

  const updatePaidQty = (value: string): void => {
    const next = String(parseQty(value));
    if (inCart) {
      cart.setQty(product.id, Number(next));
    } else {
      setPaidQty(next);
    }
  };

  const updateFreeQty = (value: string): void => {
    const next = String(parseQty(value));
    if (inCart) {
      cart.setFreeQty(product.id, Number(next));
    } else {
      setFreeQty(next);
    }
  };

  const addOrUpdate = (): void => {
    if (!canAdd) {
      return;
    }
    if (inCart) {
      cart.setQty(product.id, currentPaidQty);
      cart.setFreeQty(product.id, currentFreeQty);
      return;
    }
    cart.add(
      { ...product, wholesalePricePaise: defaultPrice, priceTier: defaultTier },
      currentPaidQty,
      currentFreeQty,
    );
  };

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
          {formatINR(defaultPrice)} ·{' '}
          {defaultTier === 'RATE_B' ? 'Rate B (Chemist)' : 'Rate A (Stockist)'} · GST Rate (
          {product.gstRate}%) included in price
        </p>
        <div className="mt-auto space-y-3 pt-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-muted-foreground grid gap-1 text-xs font-medium">
              Paid qty
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={paidQtyValue}
                disabled={disabled}
                onChange={(event) => updatePaidQty(event.currentTarget.value)}
                className="border-input bg-background text-foreground h-10 w-full rounded-md border px-3 text-sm"
              />
            </label>
            <label className="text-muted-foreground grid gap-1 text-xs font-medium">
              Free qty
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={freeQtyValue}
                disabled={disabled}
                onChange={(event) => updateFreeQty(event.currentTarget.value)}
                className="border-input bg-background text-foreground h-10 w-full rounded-md border px-3 text-sm"
              />
            </label>
          </div>
          {currentPaidQty === 0 && currentFreeQty > 0 ? (
            <p className="text-muted-foreground text-xs">
              Free-only reimbursement line. No amount will be billed for this product.
            </p>
          ) : null}
          <Button className="w-full" disabled={!canAdd} onClick={addOrUpdate}>
            {inCart ? 'Update cart' : 'Add to cart'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
