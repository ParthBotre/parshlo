'use client';

import { type BuyerProductView } from '@parshlo/types';
import { useState } from 'react';

import { CartQuantityInput } from '@/components/cart/cart-quantity-input';
import { Button } from '@/components/ui/button';
import { clampCartQuantity } from '@/lib/cart-quantity';

export function AddToCartRow({
  product,
  onAdd,
  disabled = false,
}: {
  product: BuyerProductView;
  onAdd: (product: BuyerProductView, qty: number) => void;
  disabled?: boolean;
}): JSX.Element {
  const [qty, setQty] = useState(1);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <CartQuantityInput
        qty={qty}
        maxQty={product.availableQty}
        onQtyChange={setQty}
        disabled={disabled}
        className="w-full justify-center sm:w-auto"
      />
      <Button
        type="button"
        className="w-full shrink-0 sm:flex-1"
        disabled={disabled}
        onClick={() => onAdd(product, clampCartQuantity(qty, product.availableQty))}
      >
        Add to cart
      </Button>
    </div>
  );
}
