import { z } from 'zod';

// Decimal units: keep uploads below Vercel's 4.5 MB request limit.
export const PRODUCT_IMAGE_MAX_UPLOAD_BYTES = 4_000_000;
export const PRODUCT_IMAGE_MAX_STORED_BYTES = 1_000_000;
export const PRODUCT_IMAGE_MAX_COUNT = 8;
export const PRODUCT_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PRODUCT_IMAGE_QUOTAS = {
  staging: 1_000_000_000,
  production: 8_000_000_000,
} as const;

export const ProductImageView = z.object({
  id: z.string().uuid(),
  key: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  state: z.enum(['RESERVED', 'READY', 'DELETING']),
});
export type ProductImageView = z.infer<typeof ProductImageView>;

export const ProductImagesView = z.object({
  enabled: z.boolean(),
  images: z.array(ProductImageView),
  usedBytes: z.number().int().nonnegative(),
  limitBytes: z.number().int().nonnegative(),
});
export type ProductImagesView = z.infer<typeof ProductImagesView>;
