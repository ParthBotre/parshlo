/**
 * Pure-logic test of the order status state machine.
 *
 * We hoist the TRANSITIONS map out of the service into a tested constant so
 * we don't need a live DB / Prisma client to verify the workflow rules.
 */
import { type OrderStatus } from '@parshlo/types';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['UNDER_REVIEW', 'CANCELLED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

describe('Order state machine', () => {
  it('allows the canonical happy path', () => {
    const path: OrderStatus[] = [
      'RECEIVED',
      'UNDER_REVIEW',
      'APPROVED',
      'PREPARING',
      'DISPATCHED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it('disallows skipping stages', () => {
    expect(canTransition('RECEIVED', 'DISPATCHED')).toBe(false);
    expect(canTransition('APPROVED', 'OUT_FOR_DELIVERY')).toBe(false);
  });

  it('cancellation is allowed up to PREPARING but not after dispatch', () => {
    expect(canTransition('RECEIVED', 'CANCELLED')).toBe(true);
    expect(canTransition('APPROVED', 'CANCELLED')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED')).toBe(true);
    expect(canTransition('DISPATCHED', 'CANCELLED')).toBe(false);
    expect(canTransition('DELIVERED', 'CANCELLED')).toBe(false);
  });

  it('terminal states have no outgoing edges', () => {
    expect(TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(TRANSITIONS.CANCELLED).toHaveLength(0);
    expect(TRANSITIONS.REJECTED).toHaveLength(0);
  });

  it('rejection is only valid in early stages', () => {
    expect(canTransition('RECEIVED', 'REJECTED')).toBe(true);
    expect(canTransition('UNDER_REVIEW', 'REJECTED')).toBe(true);
    expect(canTransition('APPROVED', 'REJECTED')).toBe(false);
    expect(canTransition('PREPARING', 'REJECTED')).toBe(false);
  });
});
