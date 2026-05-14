import { z } from 'zod';

import { IsoDateString, Uuid } from './common.js';
import { Paise } from './product.js';

export const OrderStatus = z.enum([
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
export type OrderStatus = z.infer<typeof OrderStatus>;

export const OrderItemInput = z.object({
  productId: Uuid,
  quantity: z.number().int().positive(),
});
export type OrderItemInput = z.infer<typeof OrderItemInput>;

export const PlaceOrderInput = z.object({
  items: z.array(OrderItemInput).min(1).max(200),
  purchaseOrderNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
  /** Idempotency key — clients MUST send a UUID per logical order to prevent duplicates. */
  idempotencyKey: z.string().uuid(),
});
export type PlaceOrderInput = z.infer<typeof PlaceOrderInput>;

export const OrderItemView = z.object({
  productId: Uuid,
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPricePaise: Paise,
  gstRate: z.string(),
  lineSubtotalPaise: Paise,
  lineGstPaise: Paise,
  lineTotalPaise: Paise,
});
export type OrderItemView = z.infer<typeof OrderItemView>;

export const OrderView = z.object({
  id: Uuid,
  orderNumber: z.string(), // human-readable, e.g. PSH-2026-000123
  status: OrderStatus,
  buyerId: Uuid,
  buyerBusinessName: z.string(),
  buyerGstin: z.string(),
  purchaseOrderNumber: z.string().nullable(),
  notes: z.string().nullable(),
  items: z.array(OrderItemView),
  subtotalPaise: Paise,
  gstPaise: Paise,
  totalPaise: Paise,
  placedAt: IsoDateString,
  updatedAt: IsoDateString,
  dispatchedAt: IsoDateString.nullable(),
  deliveredAt: IsoDateString.nullable(),
});
export type OrderView = z.infer<typeof OrderView>;

export const UpdateOrderStatusInput = z.object({
  status: OrderStatus,
  note: z.string().max(1000).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInput>;
