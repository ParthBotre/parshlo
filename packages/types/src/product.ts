import { z } from 'zod';

import { EntityId, IsoDateString } from './common.js';

export const ProductForm = z.enum([
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'SUSPENSION',
  'INJECTION',
  'OINTMENT',
  'CREAM',
  'GEL',
  'DROPS',
  'INHALER',
  'POWDER',
  'SACHET',
  'OTHER',
]);
export type ProductForm = z.infer<typeof ProductForm>;

export const ScheduleDrug = z.enum([
  'NONE',
  'SCHEDULE_G',
  'SCHEDULE_H',
  'SCHEDULE_H1',
  'SCHEDULE_X',
]);
export type ScheduleDrug = z.infer<typeof ScheduleDrug>;

export const ProductStatus = z.enum(['DRAFT', 'ACTIVE', 'DISABLED', 'OUT_OF_STOCK']);
export type ProductStatus = z.infer<typeof ProductStatus>;

/** Monetary value stored as integer paise (1 INR = 100 paise) to avoid float drift. */
export const Paise = z.number().int().nonnegative();
export type Paise = z.infer<typeof Paise>;

/** GST percentage band — fixed Indian rates. */
export const GstRate = z.enum(['0', '5', '12', '18', '28']);
export type GstRate = z.infer<typeof GstRate>;

export const ProductPriceTier = z.enum(['RATE_A', 'RATE_B']);
export type ProductPriceTier = z.infer<typeof ProductPriceTier>;

/** Public-facing product view (NO wholesale price, NO MRP exposed publicly per spec). */
export const PublicProductView = z.object({
  id: EntityId,
  slug: z.string(),
  name: z.string(),
  composition: z.string(),
  strength: z.string(),
  form: ProductForm,
  packaging: z.string(),
  description: z.string(),
  category: z.string(),
  manufacturer: z.string(),
  imageUrls: z.array(z.string().url()),
  prescriptionRequired: z.boolean(),
  scheduleDrug: ScheduleDrug,
  status: ProductStatus,
});
export type PublicProductView = z.infer<typeof PublicProductView>;

/** Verified-buyer view — adds wholesale pricing, MRP, MOQ, and live inventory. */
export const BuyerProductView = PublicProductView.extend({
  /** Selected inclusive rate for this buyer/session. Retained for cart compatibility. */
  wholesalePricePaise: Paise,
  rateAPaise: Paise,
  rateBPaise: Paise,
  priceTier: ProductPriceTier,
  mrpPaise: Paise,
  /** Display-only GST percentage. Rate A / Rate B are already GST-inclusive. */
  gstRate: GstRate,
  moq: z.number().int().positive(),
  availableQty: z.number().int().nonnegative(),
  batchInfo: z
    .object({
      batchNo: z.string(),
      mfgDate: IsoDateString,
      expDate: IsoDateString,
    })
    .nullable(),
});
export type BuyerProductView = z.infer<typeof BuyerProductView>;

export const AdminProductView = BuyerProductView.extend({
  hsnCode: z.string(),
  imageKeys: z.array(z.string()),
  deletedAt: IsoDateString.nullable(),
});
export type AdminProductView = z.infer<typeof AdminProductView>;

/** Admin product mutation payload. */
export const ProductWriteInput = z.object({
  name: z.string().trim().min(2).max(200),
  composition: z.string().trim().min(2).max(500),
  strength: z.string().trim().min(1).max(60),
  form: ProductForm,
  packaging: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(120),
  manufacturer: z.string().trim().min(2).max(200),
  imageKeys: z.array(z.string().min(1)).max(8),
  prescriptionRequired: z.boolean(),
  scheduleDrug: ScheduleDrug,
  wholesalePricePaise: Paise,
  rateAPaise: Paise.optional(),
  rateBPaise: Paise.optional(),
  mrpPaise: Paise,
  gstRate: GstRate,
  moq: z.number().int().positive(),
  hsnCode: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'HSN must be 4-8 digits'),
  status: ProductStatus.default('DRAFT'),
});
export type ProductWriteInput = z.infer<typeof ProductWriteInput>;
