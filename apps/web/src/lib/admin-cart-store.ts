'use client';

import { type BuyerProductView } from '@parshlo/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { clampCartQuantity } from '@/lib/cart-quantity';
import { type CartLine, totals } from '@/lib/cart-store';

export { totals };
export type { CartLine };

interface AdminCartState {
  lines: CartLine[];
  add: (product: BuyerProductView, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useAdminCart = create<AdminCartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, qty = 1) =>
        set((state) => {
          const nextQty = clampCartQuantity(qty, product.availableQty);
          const existing = state.lines.find((l) => l.productId === product.id);
          if (existing) {
            const maxQty = Math.max(existing.maxQty, product.availableQty);
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
                gstRate: product.gstRate,
                maxQty: product.availableQty,
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
    { name: 'parshlo-admin-cart-v1' },
  ),
);
