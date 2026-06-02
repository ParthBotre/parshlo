import { z } from 'zod';

import { EntityId, IsoDateString } from './common.js';
import { Paise, ProductPriceTier } from './product.js';

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

/** Allowed status transitions (canonical workflow). */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  RECEIVED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PREPARING'],
  PREPARING: ['DISPATCHED'],
  DISPATCHED: [],
  DELIVERED: [],
  OUT_FOR_DELIVERY: [],
  CANCELLED: [],
  REJECTED: [],
};

export const OrderItemInput = z
  .object({
    productId: EntityId,
    quantity: z.number().int().nonnegative(),
    schemeFreeQuantity: z.number().int().nonnegative().default(0),
    discountPaise: Paise.default(0),
    priceTier: ProductPriceTier.optional(),
  })
  .refine((item) => item.quantity > 0 || item.schemeFreeQuantity > 0, {
    path: ['quantity'],
    message: 'Remove the product line or keep at least one paid/free unit.',
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

/** Staff place an order for a verified buyer (admin console). */
export const PlaceOrderOnBehalfInput = PlaceOrderInput.extend({
  buyerId: EntityId,
});
export type PlaceOrderOnBehalfInput = z.infer<typeof PlaceOrderOnBehalfInput>;

export const UpdateOrderBeforeApprovalInput = PlaceOrderInput.omit({ idempotencyKey: true });
export type UpdateOrderBeforeApprovalInput = z.infer<typeof UpdateOrderBeforeApprovalInput>;

export const OrderItemView = z.object({
  productId: EntityId,
  productName: z.string(),
  quantity: z.number().int().nonnegative(),
  schemeFreeQuantity: z.number().int().nonnegative().default(0),
  unitPricePaise: Paise,
  discountPaise: Paise.default(0),
  priceTier: ProductPriceTier.default('RATE_A'),
  gstRate: z.string(),
  lineSubtotalPaise: Paise,
  lineGstPaise: Paise,
  lineTotalPaise: Paise,
});
export type OrderItemView = z.infer<typeof OrderItemView>;

export const CourierService = z.enum(['PROFESSIONAL', 'MARK', 'TEJ', 'SHIPKART', 'VISHWA']);
export type CourierService = z.infer<typeof CourierService>;

export const UpdateCourierTrackingInput = z.object({
  courierService: CourierService,
  docketNumber: z.string().trim().min(1).max(80),
  freightAmountPaise: z.number().int().nonnegative().optional(),
  weightKg: z.number().positive().optional(),
  boxCount: z.number().int().positive().default(1),
});
export type UpdateCourierTrackingInput = z.infer<typeof UpdateCourierTrackingInput>;

export const OrderView = z.object({
  id: EntityId,
  orderNumber: z.string(), // human-readable, e.g. PSH-2026-000123
  status: OrderStatus,
  buyerId: EntityId,
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
  /** Null when no receipt; omitted on older API builds — coerced to null on parse. */
  courierReceipt: z
    .object({
      contentType: z.string(),
      uploadedAt: IsoDateString,
    })
    .nullable()
    .default(null),
  courierTracking: z
    .object({
      service: CourierService,
      docketNumber: z.string(),
      /** When courier + docket were first saved (omitted on rows saved before timestamps existed). */
      bookedAt: IsoDateString.optional(),
      /** When courier + docket were last saved. */
      updatedAt: IsoDateString.optional(),
    })
    .nullable()
    .default(null),
});
export type OrderView = z.infer<typeof OrderView>;

/** S3 location returned from presigned upload; sent back when marking DISPATCHED. */
export const CourierReceiptRef = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  contentType: z.string().min(1),
});
export type CourierReceiptRef = z.infer<typeof CourierReceiptRef>;

export const CourierReceiptUploadRequest = z.object({
  contentType: z.enum(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});
export type CourierReceiptUploadRequest = z.infer<typeof CourierReceiptUploadRequest>;

export const CourierReceiptPresignedUploadResponse = z.object({
  url: z.string().url(),
  bucket: z.string(),
  key: z.string(),
  method: z.literal('PUT'),
  expiresIn: z.number().int().positive(),
});
export type CourierReceiptPresignedUploadResponse = z.infer<
  typeof CourierReceiptPresignedUploadResponse
>;

export const AttachCourierReceiptInput = CourierReceiptRef;
export type AttachCourierReceiptInput = z.infer<typeof AttachCourierReceiptInput>;

export const UpdateOrderStatusInput = z.object({
  status: OrderStatus,
  note: z.string().max(1000).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInput>;
