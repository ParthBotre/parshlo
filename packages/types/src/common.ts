import { z } from 'zod';

/** RFC 3339 timestamp returned by the API. */
export const IsoDateString = z.string().datetime({ offset: true });
export type IsoDateString = z.infer<typeof IsoDateString>;

/** UUID v4. */
export const Uuid = z.string().uuid();
export type Uuid = z.infer<typeof Uuid>;

/** Pagination params accepted by list endpoints. */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

/** Generic paginated list response. */
export const PaginatedResponse = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({
      page: z.number().int(),
      pageSize: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  });

/**
 * Standardized error envelope returned by the API on non-2xx responses.
 * Modeled after RFC 7807 Problem Details with extensions.
 */
export const ApiErrorResponse = z.object({
  type: z.string().url().or(z.literal('about:blank')),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  errors: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
        code: z.string().optional(),
      }),
    )
    .optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;

/** Indian GSTIN validation (15 chars: 2 state + 10 PAN + 1 entity + 1 'Z' + 1 checksum). */
export const Gstin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format',
  );
export type Gstin = z.infer<typeof Gstin>;

/** PAN: 10 chars (5 letters + 4 digits + 1 letter). */
export const Pan = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format');
export type Pan = z.infer<typeof Pan>;

/** Indian mobile number — accepts +91 prefix or 10-digit. */
export const IndianMobile = z
  .string()
  .trim()
  .regex(/^(\+91[- ]?)?[6-9]\d{9}$/, 'Invalid Indian mobile number');
export type IndianMobile = z.infer<typeof IndianMobile>;

/** Indian PIN (postal) code — 6 digits, first digit 1-9. */
export const IndianPin = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code');
export type IndianPin = z.infer<typeof IndianPin>;
