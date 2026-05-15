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

const AnalyticsSummary = z.object({
  pendingKyc: z.number(),
  approvedBuyers: z.number(),
  ordersThisMonth: z.number(),
  grossThisMonthPaise: z.number(),
});

const AdminOrderRow = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  placedAt: z.string(),
  buyerBusinessName: z.string(),
  buyerGstin: z.string(),
  totalPaise: z.number(),
  itemCount: z.number(),
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
