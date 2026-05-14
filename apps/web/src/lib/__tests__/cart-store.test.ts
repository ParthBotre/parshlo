import { describe, expect, it } from 'vitest';

import { totals, type CartLine } from '../cart-store';

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  slug: 'p1',
  name: 'Paracetamol 500mg',
  unitPricePaise: 1000, // ₹10.00 wholesale
  gstRate: '12',
  moq: 100,
  qty: 100,
  ...overrides,
});

describe('cart totals', () => {
  it('returns zeros for empty cart', () => {
    expect(totals([])).toEqual({ subtotal: 0, gst: 0, total: 0, itemCount: 0 });
  });

  it('computes subtotal + GST + total for a single line', () => {
    const t = totals([line()]);
    expect(t.subtotal).toBe(100 * 1000);
    // 12% of 100 000 paise = 12 000
    expect(t.gst).toBe(12_000);
    expect(t.total).toBe(112_000);
    expect(t.itemCount).toBe(1);
  });

  it('sums multiple lines with mixed GST rates', () => {
    const t = totals([
      line({ productId: 'a', unitPricePaise: 1000, qty: 10, gstRate: '5' }),
      line({ productId: 'b', unitPricePaise: 2000, qty: 5, gstRate: '12' }),
      line({ productId: 'c', unitPricePaise: 500, qty: 4, gstRate: '0' }),
    ]);
    expect(t.subtotal).toBe(10 * 1000 + 5 * 2000 + 4 * 500);
    expect(t.gst).toBe(
      Math.round((10 * 1000 * 500) / 10_000) +
        Math.round((5 * 2000 * 1200) / 10_000) +
        0,
    );
    expect(t.total).toBe(t.subtotal + t.gst);
    expect(t.itemCount).toBe(3);
  });
});
