import { OrderView } from '@parshlo/types';
import { z } from 'zod';

import { apiCall, type ApiCallOptions } from '../api-client';

const PendingKycAddress = z.object({
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pin: z.string(),
});

const PendingKyc = z.array(
  z.object({
    id: z.string(),
    userId: z.string(),
    status: z.string(),
    submittedAt: z.string(),
    ownerName: z.string(),
    accountEmail: z.string(),
    businessName: z.string(),
    businessEmail: z.string(),
    businessType: z.string().nullable(),
    gstin: z.string().nullable(),
    pan: z.string().nullable(),
    drugLicenseNumber: z.string().nullable(),
    pharmacyRegistrationNumber: z.string().nullable(),
    mobile: z.string().nullable(),
    address: PendingKycAddress.nullable(),
  }),
);

const SalesByCityRow = z.object({
  city: z.string(),
  state: z.string(),
  orderCount: z.number(),
  grossPaise: z.number(),
  sharePercent: z.number(),
});

const SalesByCity = z.object({
  monthStart: z.string(),
  totalGrossPaise: z.number(),
  totalOrders: z.number(),
  rows: z.array(SalesByCityRow),
});

const AnalyticsSummary = z.object({
  pendingKyc: z.number(),
  approvedBuyers: z.number(),
  ordersThisMonth: z.number(),
  grossThisMonthPaise: z.number(),
  /** Present once API includes location breakdown in summary (same month window as totals). */
  salesByCity: SalesByCity.optional(),
});

const AdminOrderRow = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  placedAt: z.string(),
  buyerBusinessName: z.string(),
  buyerFullName: z.string().optional(),
  buyerGstin: z.string(),
  buyerCity: z.string().optional(),
  buyerState: z.string().optional(),
  totalPaise: z.number(),
  itemCount: z.number(),
  hasCourierReceipt: z.boolean().default(false),
});
const AdminOrderList = z.array(AdminOrderRow);

const AdminBuyerRow = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  accountStatus: z.string(),
  businessName: z.string().nullable(),
  gstin: z.string().nullable(),
  createdAt: z.string(),
});
const AdminBuyerList = z.array(AdminBuyerRow);

export function listPendingKyc(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof PendingKyc>> {
  return apiCall('/v1/admin/kyc/pending', PendingKyc, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function getAnalyticsSummary(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof AnalyticsSummary>> {
  return apiCall('/v1/admin/analytics/summary', AnalyticsSummary, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function getSalesByCity(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof SalesByCity>> {
  return apiCall('/v1/admin/analytics/sales-by-city', SalesByCity, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function approveKyc(accessToken: string, id: string, note?: string): Promise<void> {
  return apiCall(`/v1/kyc/${encodeURIComponent(id)}/approve`, z.void(), {
    method: 'POST',
    accessToken,
    body: note ? { note } : {},
  });
}

export function rejectKyc(accessToken: string, id: string, reason: string): Promise<void> {
  return apiCall(`/v1/kyc/${encodeURIComponent(id)}/reject`, z.void(), {
    method: 'POST',
    accessToken,
    body: { reason },
  });
}

export function listAllOrders(
  accessToken: string,
  filters: { status?: string } = {},
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof AdminOrderList>> {
  const search = filters.status ? `?status=${encodeURIComponent(filters.status)}` : '';
  return apiCall(`/v1/admin/orders${search}`, AdminOrderList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function getAdminOrder(
  accessToken: string,
  id: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof OrderView>> {
  return apiCall(`/v1/admin/orders/${encodeURIComponent(id)}`, OrderView, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function listAllBuyers(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof AdminBuyerList>> {
  return apiCall('/v1/admin/buyers', AdminBuyerList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}
