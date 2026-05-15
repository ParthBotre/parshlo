import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@parshlo/types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Received',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  PREPARING: 'Preparing',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

/** Verb labels for admin status action buttons (target status → CTA). */
export const ORDER_STATUS_ACTION_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Mark received',
  UNDER_REVIEW: 'Start review',
  APPROVED: 'Approve order',
  PREPARING: 'Begin preparing',
  DISPATCHED: 'Mark dispatched',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
  REJECTED: 'Reject order',
};

export function orderStatusActionLabel(status: OrderStatus): string {
  return ORDER_STATUS_ACTION_LABELS[status];
}

export function isDestructiveOrderStatus(status: OrderStatus): boolean {
  return status === 'CANCELLED' || status === 'REJECTED';
}

export function nextOrderStatuses(status: OrderStatus): OrderStatus[] {
  return [...ORDER_STATUS_TRANSITIONS[status]];
}

export function nextProgressOrderStatuses(status: OrderStatus): OrderStatus[] {
  return nextOrderStatuses(status).filter((s) => !isDestructiveOrderStatus(s));
}

export function nextDestructiveOrderStatuses(status: OrderStatus): OrderStatus[] {
  return nextOrderStatuses(status).filter(isDestructiveOrderStatus);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}
