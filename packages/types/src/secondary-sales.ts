import { z } from 'zod';

import { EntityId, IsoDateString } from './common.js';
import { AdminEmployeeView } from './user.js';

export const SecondarySalesStockistView = z.object({
  id: EntityId,
  name: z.string(),
  buyerId: EntityId.nullable(),
  buyerBusinessName: z.string().nullable(),
  isActive: z.boolean(),
});
export type SecondarySalesStockistView = z.infer<typeof SecondarySalesStockistView>;

export const SecondarySalesProductRowView = z.object({
  productId: EntityId,
  productName: z.string(),
  packaging: z.string(),
  primaryQuantity: z.number().int().nonnegative(),
  secondaryQuantity: z.number().int().nonnegative(),
  closingQuantity: z.number().int().nonnegative(),
  balanceQuantity: z.number().int(),
  notes: z.string().nullable(),
  updatedAt: IsoDateString.nullable(),
  updatedByName: z.string().nullable(),
});
export type SecondarySalesProductRowView = z.infer<typeof SecondarySalesProductRowView>;

export const SecondarySalesEditorView = z.object({
  id: EntityId,
  userId: EntityId,
  fullName: z.string(),
  email: z.string().email(),
  grantedAt: IsoDateString,
  grantedByName: z.string().nullable(),
});
export type SecondarySalesEditorView = z.infer<typeof SecondarySalesEditorView>;

export const SecondarySalesDashboardView = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  stockists: z.array(SecondarySalesStockistView),
  selectedStockistId: EntityId.nullable(),
  selectedStockistName: z.string().nullable(),
  canEdit: z.boolean(),
  canManageEditors: z.boolean(),
  editors: z.array(SecondarySalesEditorView),
  eligibleEditors: z.array(AdminEmployeeView),
  totals: z.object({
    primaryQuantity: z.number().int().nonnegative(),
    secondaryQuantity: z.number().int().nonnegative(),
    closingQuantity: z.number().int().nonnegative(),
    balanceQuantity: z.number().int(),
  }),
  rows: z.array(SecondarySalesProductRowView),
});
export type SecondarySalesDashboardView = z.infer<typeof SecondarySalesDashboardView>;

export const UpsertSecondarySalesEntryInputSchema = z.object({
  stockistId: EntityId,
  productId: EntityId,
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  secondaryQuantity: z.coerce.number().int().min(0),
  closingQuantity: z.coerce.number().int().min(0),
  notes: z.string().trim().max(500).optional().nullable(),
});
export type UpsertSecondarySalesEntryInput = z.infer<typeof UpsertSecondarySalesEntryInputSchema>;

export const GrantSecondarySalesEditorInputSchema = z.object({
  userId: EntityId,
});
export type GrantSecondarySalesEditorInput = z.infer<typeof GrantSecondarySalesEditorInputSchema>;
