import { type PublicProductView } from '@parshlo/types';
import { describe, expect, it } from 'vitest';

import { latestProducts } from '../latest-products';

function product(slug: string, createdAt?: string): PublicProductView {
  return {
    id: slug,
    slug,
    name: slug,
    composition: '',
    strength: '',
    form: 'TABLET',
    packaging: '',
    description: '',
    category: 'Catalog',
    manufacturer: 'Parshlo',
    imageUrls: [],
    prescriptionRequired: false,
    scheduleDrug: 'NONE',
    status: 'ACTIVE',
    createdAt,
  };
}

describe('latestProducts', () => {
  it('puts newly added products ahead of the current launch collection', () => {
    const result = latestProducts([
      product('apogest-sr-300', '2026-09-16T00:00:00.000Z'),
      product('future-launch', '2026-11-02T00:00:00.000Z'),
      product('older', '2026-06-01T00:00:00.000Z'),
    ]);

    expect(result.map((item) => item.slug)).toEqual(['future-launch', 'apogest-sr-300', 'older']);
  });

  it('uses the known newest collection while the deployed API omits dates', () => {
    const result = latestProducts([
      product('older'),
      product('ovaborn-xt'),
      product('niddydro-20-mg'),
      product('apogest-sr-300'),
    ]);

    expect(result.map((item) => item.slug)).toEqual([
      'apogest-sr-300',
      'ovaborn-xt',
      'niddydro-20-mg',
      'older',
    ]);
  });
});
