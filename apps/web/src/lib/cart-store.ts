'use client';

import { type BuyerProductView } from '@parshlo/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { UNLIMITED_CART_QTY, clampCartQuantity } from '@/lib/cart-quantity';

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  unitPricePaise: number;
  rateAPaise?: number;
  rateBPaise?: number;
  priceTier?: BuyerProductView['priceTier'];
  gstRate: BuyerProductView['gstRate'];
  /** Available units when added; used to cap manual quantity entry. */
  maxQty: number;
  qty: number;
  schemeFreeQuantity?: number;
  discountPaise?: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: BuyerProductView, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, qty = 1) =>
        set((state) => {
          const nextQty = clampCartQuantity(qty, UNLIMITED_CART_QTY);
          const existing = state.lines.find((l) => l.productId === product.id);
          if (existing) {
            const maxQty = Math.max(existing.maxQty, UNLIMITED_CART_QTY);
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id
                  ? {
                      ...l,
                      maxQty,
                      qty: clampCartQuantity(l.qty + nextQty, maxQty),
                    }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                productId: product.id,
                slug: product.slug,
                name: product.name,
                unitPricePaise: product.wholesalePricePaise,
                rateAPaise: product.rateAPaise,
                rateBPaise: product.rateBPaise,
                priceTier: product.priceTier,
                gstRate: product.gstRate,
                maxQty: UNLIMITED_CART_QTY,
                qty: nextQty,
              },
            ],
          };
        }),
      setQty: (productId, qty) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId
              ? {
                  ...l,
                  qty: clampCartQuantity(qty, l.maxQty || qty),
                }
              : l,
          ),
        })),
      remove: (productId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.productId !== productId),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'parshlo-cart-v1' },
  ),
);

export function totals(lines: CartLine[]): {
  subtotal: number;
  gst: number;
  total: number;
  itemCount: number;
} {
  let subtotal = 0;
  let gst = 0;
  for (const l of lines) {
    const rawSubtotal = l.unitPricePaise * l.qty;
    const lineSubtotal = Math.max(rawSubtotal - (l.discountPaise ?? 0), 0);
    const lineGst = 0;
    subtotal += lineSubtotal;
    gst += lineGst;
  }
  return { subtotal, gst, total: subtotal + gst, itemCount: lines.length };
}
