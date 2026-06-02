'use client';

import { type BuyerProductView } from '@parshlo/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { UNLIMITED_CART_QTY } from '@/lib/cart-quantity';
import { type CartLine, totals } from '@/lib/cart-store';

export { totals };
export type { CartLine };

interface AdminCartState {
  lines: CartLine[];
  add: (product: BuyerProductView, qty?: number, freeQty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  setPriceTier: (productId: string, tier: NonNullable<CartLine['priceTier']>) => void;
  setFreeQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

function clampAdminQuantity(qty: number, maxQty: number): number {
  const max = Number.isFinite(maxQty) && maxQty > 0 ? Math.floor(maxQty) : UNLIMITED_CART_QTY;
  const value = Math.floor(qty);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(0, value));
}

export const useAdminCart = create<AdminCartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, qty = 1, freeQty = 0) =>
        set((state) => {
          const nextQty = clampAdminQuantity(qty, UNLIMITED_CART_QTY);
          const nextFreeQty = clampAdminQuantity(freeQty, UNLIMITED_CART_QTY);
          const existing = state.lines.find((l) => l.productId === product.id);
          if (existing) {
            const maxQty = Math.max(existing.maxQty, UNLIMITED_CART_QTY);
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id
                  ? {
                      ...l,
                      maxQty,
                      qty: clampAdminQuantity(l.qty + nextQty, maxQty),
                      schemeFreeQuantity: clampAdminQuantity(
                        (l.schemeFreeQuantity ?? 0) + nextFreeQty,
                        maxQty,
                      ),
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
                schemeFreeQuantity: nextFreeQty,
                discountPaise: 0,
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
                  qty: clampAdminQuantity(qty, l.maxQty || UNLIMITED_CART_QTY),
                }
              : l,
          ),
        })),
      setPriceTier: (productId, tier) =>
        set((state) => ({
          lines: state.lines.map((l) => {
            if (l.productId !== productId) {
              return l;
            }
            const unitPricePaise =
              tier === 'RATE_B'
                ? (l.rateBPaise ?? l.unitPricePaise)
                : (l.rateAPaise ?? l.unitPricePaise);
            return {
              ...l,
              priceTier: tier,
              unitPricePaise,
              discountPaise: 0,
            };
          }),
        })),
      setFreeQty: (productId, qty) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId
              ? {
                  ...l,
                  schemeFreeQuantity: clampAdminQuantity(qty, l.maxQty || UNLIMITED_CART_QTY),
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
    { name: 'parshlo-admin-cart-v1' },
  ),
);
