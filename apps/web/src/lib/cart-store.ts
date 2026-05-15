'use client';

import { type BuyerProductView } from '@parshlo/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  unitPricePaise: number;
  gstRate: BuyerProductView['gstRate'];
  moq: number;
  qty: number;
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
      add: (product, qty = product.moq) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === product.id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id ? { ...l, qty: l.qty + qty } : l,
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
                moq: product.moq,
                qty,
              },
            ],
          };
        }),
      setQty: (productId, qty) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId ? { ...l, qty: Math.max(l.moq, qty) } : l,
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

/**
 * Compute totals for the cart. Mirrors the server-side computation in
 * apps/api/src/modules/order/order.service.ts.
 */
const GST_BASIS: Record<BuyerProductView['gstRate'], number> = {
  '0': 0,
  '5': 500,
  '12': 1200,
  '18': 1800,
  '28': 2800,
};

export function totals(lines: CartLine[]): {
  subtotal: number;
  gst: number;
  total: number;
  itemCount: number;
} {
  let subtotal = 0;
  let gst = 0;
  for (const l of lines) {
    const lineSubtotal = l.unitPricePaise * l.qty;
    const lineGst = Math.round((lineSubtotal * GST_BASIS[l.gstRate]) / 10_000);
    subtotal += lineSubtotal;
    gst += lineGst;
  }
  return { subtotal, gst, total: subtotal + gst, itemCount: lines.length };
}
