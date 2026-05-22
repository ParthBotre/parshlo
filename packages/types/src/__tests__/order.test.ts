import { describe, expect, it } from 'vitest';

import { OrderStatus, PlaceOrderInput, PlaceOrderOnBehalfInput } from '../order.js';

describe('OrderStatus', () => {
  it('includes all expected stages', () => {
    expect(OrderStatus.options).toEqual([
      'RECEIVED',
      'UNDER_REVIEW',
      'APPROVED',
      'PREPARING',
      'DISPATCHED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
    ]);
  });
});

describe('PlaceOrderInput', () => {
  const validBase = {
    items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: 50 }],
    idempotencyKey: '22222222-2222-2222-2222-222222222222',
  };

  it('accepts a minimal valid order', () => {
    expect(PlaceOrderInput.parse(validBase)).toEqual({
      items: [
        {
          productId: '11111111-1111-1111-1111-111111111111',
          quantity: 50,
          schemeFreeQuantity: 0,
          discountPaise: 0,
        },
      ],
      idempotencyKey: '22222222-2222-2222-2222-222222222222',
    });
  });

  it('rejects an order with no items', () => {
    expect(() => PlaceOrderInput.parse({ ...validBase, items: [] })).toThrow();
  });

  it('rejects an order with more than 200 line items', () => {
    const items = Array.from({ length: 201 }, () => ({
      productId: '11111111-1111-1111-1111-111111111111',
      quantity: 1,
    }));
    expect(() => PlaceOrderInput.parse({ ...validBase, items })).toThrow();
  });

  it('requires a UUID idempotency key', () => {
    expect(() => PlaceOrderInput.parse({ ...validBase, idempotencyKey: 'not-a-uuid' })).toThrow();
  });

  it('rejects non-positive quantities', () => {
    expect(() =>
      PlaceOrderInput.parse({
        ...validBase,
        items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: 0 }],
      }),
    ).toThrow();
    expect(() =>
      PlaceOrderInput.parse({
        ...validBase,
        items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: -1 }],
      }),
    ).toThrow();
  });
});

describe('PlaceOrderOnBehalfInput', () => {
  it('requires buyerId plus standard order fields', () => {
    expect(
      PlaceOrderOnBehalfInput.parse({
        buyerId: '33333333-3333-3333-3333-333333333333',
        items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: 10 }],
        idempotencyKey: '22222222-2222-2222-2222-222222222222',
      }),
    ).toMatchObject({
      buyerId: '33333333-3333-3333-3333-333333333333',
    });
  });
});
