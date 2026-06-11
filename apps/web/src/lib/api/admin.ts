import {
  type AdminCreateBuyerInputSchema,
  AdminCreateEmployeeInputSchema,
  AdminEmployeeView,
  type AdminUpdateBuyerInputSchema,
  type AdminUpdateEmployeeInputSchema,
  ArchiveHrEmployeeInputSchema,
  CreateHrExpenseInputSchema,
  EmailHrDocumentInputSchema,
  EmailHrDocumentResponse,
  CreateLeaveRequestInputSchema,
  EmployeeLeaveDashboardView,
  EmployeeLeaveRequestView,
  GenerateHrDocumentInputSchema,
  GenerateHrDocumentResponse,
  GenerateHrSalarySlipInputSchema,
  GenerateHrSalarySlipResponse,
  HrDashboardView,
  HrEmployeeRecordView,
  HrExpenseView,
  HrWorkLogView,
  AdminProductView,
  ApiErrorResponse,
  OrderView,
  type PlaceOrderOnBehalfInput,
  ReviewHrExpenseInputSchema,
  ProductWriteInput,
  ReviewLeaveRequestInputSchema,
  type UpdateOrderBeforeApprovalInput,
  UpsertHrEmployeeRecordInputSchema,
  UpsertHrWorkLogInputSchema,
} from '@parshlo/types';
import { z } from 'zod';

import { apiCall, ApiError, type ApiCallOptions } from '../api-client';

type ArchiveHrEmployeeInput = z.infer<typeof ArchiveHrEmployeeInputSchema>;
type AdminCreateEmployeeInput = z.infer<typeof AdminCreateEmployeeInputSchema>;
type AdminCreateBuyerInput = z.infer<typeof AdminCreateBuyerInputSchema>;
type CreateHrExpenseInput = z.infer<typeof CreateHrExpenseInputSchema>;
type EmailHrDocumentInput = z.infer<typeof EmailHrDocumentInputSchema>;
type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestInputSchema>;
type GenerateHrDocumentInput = z.infer<typeof GenerateHrDocumentInputSchema>;
type GenerateHrSalarySlipInput = z.infer<typeof GenerateHrSalarySlipInputSchema>;
type AdminUpdateBuyerInput = z.infer<typeof AdminUpdateBuyerInputSchema>;
type AdminUpdateEmployeeInput = z.infer<typeof AdminUpdateEmployeeInputSchema>;
type PlaceOrderOnBehalfInputType = z.infer<typeof PlaceOrderOnBehalfInput>;
type ProductWriteInputType = z.infer<typeof ProductWriteInput>;
type ReviewHrExpenseInput = z.infer<typeof ReviewHrExpenseInputSchema>;
type ReviewLeaveRequestInput = z.infer<typeof ReviewLeaveRequestInputSchema>;
type UpdateOrderBeforeApprovalInputType = z.infer<typeof UpdateOrderBeforeApprovalInput>;
type UpsertHrEmployeeRecordInput = z.infer<typeof UpsertHrEmployeeRecordInputSchema>;
type UpsertHrWorkLogInput = z.infer<typeof UpsertHrWorkLogInputSchema>;

const PendingKycAddress = z.object({
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  pin: z.string().nullable(),
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
  buyerId: z.string(),
  status: z.string(),
  placedAt: z.string(),
  buyerBusinessName: z.string(),
  buyerFullName: z.string().optional(),
  buyerGstin: z.string(),
  buyerCity: z.string().optional(),
  buyerState: z.string().optional(),
  totalPaise: z.number(),
  itemCount: z.number(),
  rateTierSummary: z.enum(['RATE_A', 'RATE_B', 'MIXED']).default('MIXED'),
  hasCourierReceipt: z.boolean().default(false),
  courierService: z.string().nullable().optional(),
  courierDocketNumber: z.string().nullable().optional(),
  courierTrackingUpdatedAt: z.string().nullable().optional(),
});
const AdminOrderList = z.array(AdminOrderRow);

const AdminBuyerRow = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  accountStatus: z.string(),
  businessName: z.string().nullable(),
  gstin: z.string().nullable(),
  pan: z.string().nullable(),
  mobile: z.string().nullable(),
  businessEmail: z.string().nullable(),
  businessType: z.string().nullable(),
  drugLicenseNumber: z.string().nullable(),
  pharmacyRegistrationNumber: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  pin: z.string().nullable(),
  country: z.string().nullable(),
  createdAt: z.string(),
  orderSummary: z.object({
    totalOrders: z.number(),
    totalPaise: z.number(),
    currentMonthOrders: z.number(),
    currentMonthPaise: z.number(),
    averageOrderPaise: z.number(),
    latestOrderNumber: z.string().nullable(),
    latestOrderStatus: z.string().nullable(),
    latestOrderAt: z.string().nullable(),
    statusCounts: z.record(z.string(), z.number()),
    periodAnalytics: z.object({
      day: z.object({
        orderCount: z.number(),
        totalPaise: z.number(),
        averageOrderPaise: z.number(),
      }),
      week: z.object({
        orderCount: z.number(),
        totalPaise: z.number(),
        averageOrderPaise: z.number(),
      }),
      month: z.object({
        orderCount: z.number(),
        totalPaise: z.number(),
        averageOrderPaise: z.number(),
      }),
      year: z.object({
        orderCount: z.number(),
        totalPaise: z.number(),
        averageOrderPaise: z.number(),
      }),
    }),
  }),
});
const AdminBuyerList = z.array(AdminBuyerRow);
const AdminBuyerDetail = AdminBuyerRow.extend({
  recentOrders: z.array(
    z.object({
      id: z.string(),
      orderNumber: z.string(),
      status: z.string(),
      placedAt: z.string(),
      totalPaise: z.number(),
      itemCount: z.number(),
      courierService: z.string().nullable(),
      courierDocketNumber: z.string().nullable(),
    }),
  ),
});

const AdminEmployeeList = z.array(AdminEmployeeView);
const AdminProductList = z.array(AdminProductView);
const LeaveDashboard = EmployeeLeaveDashboardView;
const HrDashboard = HrDashboardView;

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

const SalesAnalyticsPeriod = z.enum(['day', 'week', 'month', 'year']);
const SalesAnalytics = z.object({
  period: SalesAnalyticsPeriod,
  anchor: z.string(),
  label: z.string(),
  totalGrossPaise: z.number(),
  totalOrders: z.number(),
  productRows: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      chargedQuantity: z.number(),
      freeQuantity: z.number(),
      grossPaise: z.number(),
      discountPaise: z.number(),
      sharePercent: z.number(),
    }),
  ),
  regionRows: z.array(
    z.object({
      region: z.string(),
      orderCount: z.number(),
      grossPaise: z.number(),
      sharePercent: z.number(),
    }),
  ),
});

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
) {
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
) {
  return apiCall(`/v1/admin/orders/${encodeURIComponent(id)}`, OrderView, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function updateAdminOrderBeforeApproval(
  accessToken: string,
  id: string,
  input: UpdateOrderBeforeApprovalInputType,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
) {
  return apiCall(`/v1/admin/orders/${encodeURIComponent(id)}`, OrderView, {
    method: 'PATCH',
    accessToken,
    body: input,
    ...options,
  });
}

export function deleteAdminOrder(
  accessToken: string,
  id: string,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<void> {
  return apiCall(`/v1/admin/orders/${encodeURIComponent(id)}`, z.void(), {
    method: 'DELETE',
    accessToken,
    ...options,
  });
}

export function getSalesAnalytics(
  accessToken: string,
  filters: { period?: string; anchor?: string } = {},
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof SalesAnalytics>> {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (filters.anchor) params.set('anchor', filters.anchor);
  const search = params.toString() ? `?${params.toString()}` : '';
  return apiCall(`/v1/admin/analytics/sales${search}`, SalesAnalytics, {
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

export function getAdminBuyer(
  accessToken: string,
  id: string,
  filters: { period?: string; anchor?: string } = {},
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof AdminBuyerDetail>> {
  const params = new URLSearchParams();
  if (filters.period) params.set('period', filters.period);
  if (filters.anchor) params.set('anchor', filters.anchor);
  const search = params.toString() ? `?${params.toString()}` : '';

  return apiCall(`/v1/admin/buyers/${encodeURIComponent(id)}${search}`, AdminBuyerDetail, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export type AdminBuyer = z.infer<typeof AdminBuyerRow>;

export type AdminEmployee = z.infer<typeof AdminEmployeeView>;
export type AdminProduct = z.infer<typeof AdminProductView>;
export type EmployeeLeaveDashboard = z.infer<typeof EmployeeLeaveDashboardView>;
export type EmployeeLeaveRequest = z.infer<typeof EmployeeLeaveRequestView>;
export type HrDashboard = z.infer<typeof HrDashboardView>;
export type HrEmployeeRecord = z.infer<typeof HrEmployeeRecordView>;
export type HrExpense = z.infer<typeof HrExpenseView>;
export type HrWorkLog = z.infer<typeof HrWorkLogView>;

export function listEmployees(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<AdminEmployee[]> {
  return apiCall('/v1/admin/employees', AdminEmployeeList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function createEmployee(
  accessToken: string,
  input: AdminCreateEmployeeInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<AdminEmployee> {
  return apiCall('/v1/admin/employees', AdminEmployeeView, {
    method: 'POST',
    accessToken,
    body: AdminCreateEmployeeInputSchema.parse(input),
    ...options,
  });
}

export function updateEmployee(
  accessToken: string,
  id: string,
  input: AdminUpdateEmployeeInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<AdminEmployee> {
  return apiCall(`/v1/admin/employees/${encodeURIComponent(id)}`, AdminEmployeeView, {
    method: 'PATCH',
    accessToken,
    body: input,
    ...options,
  });
}

export function getLeaveDashboard(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<EmployeeLeaveDashboard> {
  return apiCall('/v1/admin/leave-requests', LeaveDashboard, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function createLeaveRequest(
  accessToken: string,
  input: CreateLeaveRequestInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<EmployeeLeaveRequest> {
  return apiCall('/v1/admin/leave-requests', EmployeeLeaveRequestView, {
    method: 'POST',
    accessToken,
    body: CreateLeaveRequestInputSchema.parse(input),
    ...options,
  });
}

export function reviewLeaveRequest(
  accessToken: string,
  id: string,
  input: ReviewLeaveRequestInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<EmployeeLeaveRequest> {
  return apiCall(
    `/v1/admin/leave-requests/${encodeURIComponent(id)}/review`,
    EmployeeLeaveRequestView,
    {
      method: 'PATCH',
      accessToken,
      body: ReviewLeaveRequestInputSchema.parse(input),
      ...options,
    },
  );
}

export function getHrDashboard(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<HrDashboard> {
  return apiCall('/v1/admin/hr', HrDashboard, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function upsertHrRecord(
  accessToken: string,
  input: UpsertHrEmployeeRecordInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<HrEmployeeRecord> {
  return apiCall('/v1/admin/hr/records', HrEmployeeRecordView, {
    method: 'PUT',
    accessToken,
    body: UpsertHrEmployeeRecordInputSchema.parse(input),
    ...options,
  });
}

export function archiveHrRecord(
  accessToken: string,
  employeeId: string,
  input: ArchiveHrEmployeeInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<HrEmployeeRecord> {
  return apiCall(
    `/v1/admin/hr/records/${encodeURIComponent(employeeId)}/archive`,
    HrEmployeeRecordView,
    {
      method: 'PATCH',
      accessToken,
      body: ArchiveHrEmployeeInputSchema.parse(input),
      ...options,
    },
  );
}

export function generateHrDocument(
  accessToken: string,
  employeeId: string,
  input: GenerateHrDocumentInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<z.infer<typeof GenerateHrDocumentResponse>> {
  return apiCall(
    `/v1/admin/hr/records/${encodeURIComponent(employeeId)}/documents`,
    GenerateHrDocumentResponse,
    {
      method: 'POST',
      accessToken,
      body: GenerateHrDocumentInputSchema.parse(input),
      ...options,
    },
  );
}

export function emailHrDocument(
  accessToken: string,
  employeeId: string,
  input: EmailHrDocumentInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<z.infer<typeof EmailHrDocumentResponse>> {
  return apiCall(
    `/v1/admin/hr/records/${encodeURIComponent(employeeId)}/documents/email`,
    EmailHrDocumentResponse,
    {
      method: 'POST',
      accessToken,
      body: EmailHrDocumentInputSchema.parse(input),
      ...options,
    },
  );
}

export function generateHrSalarySlip(
  accessToken: string,
  input: GenerateHrSalarySlipInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<z.infer<typeof GenerateHrSalarySlipResponse>> {
  return apiCall('/v1/admin/hr/salary-slips', GenerateHrSalarySlipResponse, {
    method: 'POST',
    accessToken,
    body: GenerateHrSalarySlipInputSchema.parse(input),
    ...options,
  });
}

export function createHrExpense(
  accessToken: string,
  input: CreateHrExpenseInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<HrExpense> {
  return apiCall('/v1/admin/hr/expenses', HrExpenseView, {
    method: 'POST',
    accessToken,
    body: CreateHrExpenseInputSchema.parse(input),
    ...options,
  });
}

export function reviewHrExpense(
  accessToken: string,
  id: string,
  input: ReviewHrExpenseInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<HrExpense> {
  return apiCall(`/v1/admin/hr/expenses/${encodeURIComponent(id)}/review`, HrExpenseView, {
    method: 'PATCH',
    accessToken,
    body: ReviewHrExpenseInputSchema.parse(input),
    ...options,
  });
}

export function upsertHrWorkLog(
  accessToken: string,
  input: UpsertHrWorkLogInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<HrWorkLog> {
  return apiCall('/v1/admin/hr/work-logs', HrWorkLogView, {
    method: 'PUT',
    accessToken,
    body: UpsertHrWorkLogInputSchema.parse(input),
    ...options,
  });
}

export function listAdminProducts(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<AdminProduct[]> {
  return apiCall('/v1/admin/products', AdminProductList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function createAdminProduct(
  accessToken: string,
  input: ProductWriteInputType,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<AdminProduct> {
  return apiCall('/v1/admin/products', AdminProductView, {
    method: 'POST',
    accessToken,
    body: ProductWriteInput.parse(input),
    ...options,
  });
}

export function updateAdminProduct(
  accessToken: string,
  id: string,
  input: ProductWriteInputType,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<AdminProduct> {
  return apiCall(`/v1/admin/products/${encodeURIComponent(id)}`, AdminProductView, {
    method: 'PATCH',
    accessToken,
    body: ProductWriteInput.parse(input),
    ...options,
  });
}

export function createBuyer(
  accessToken: string,
  input: AdminCreateBuyerInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<AdminBuyer> {
  return apiCall('/v1/admin/buyers', AdminBuyerRow, {
    method: 'POST',
    accessToken,
    body: input,
    ...options,
  });
}

export function updateBuyer(
  accessToken: string,
  id: string,
  input: AdminUpdateBuyerInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<AdminBuyer> {
  return apiCall(`/v1/admin/buyers/${encodeURIComponent(id)}`, AdminBuyerRow, {
    method: 'PATCH',
    accessToken,
    body: input,
    ...options,
  });
}

export function deleteBuyer(
  accessToken: string,
  id: string,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<void> {
  return apiCall(`/v1/admin/buyers/${encodeURIComponent(id)}`, z.void(), {
    method: 'DELETE',
    accessToken,
    ...options,
  });
}

export function placeOrderOnBehalf(
  accessToken: string,
  input: PlaceOrderOnBehalfInputType,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
) {
  return apiCall('/v1/admin/orders', OrderView, {
    method: 'POST',
    accessToken,
    body: input,
    idempotencyKey: input.idempotencyKey,
    ...options,
  });
}

/** Browser checkout for staff placing an order on behalf of a buyer. */
export async function placeOrderOnBehalfFromBrowser(
  input: Omit<PlaceOrderOnBehalfInputType, 'idempotencyKey'> & { idempotencyKey?: string },
): Promise<z.infer<typeof OrderView>> {
  const body: PlaceOrderOnBehalfInputType = {
    ...input,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
  };

  const res = await fetch('/api/admin/orders', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as unknown;
    const parsed = ApiErrorResponse.safeParse(json);
    const fallbackDetail =
      json &&
      typeof json === 'object' &&
      'detail' in json &&
      typeof (json as { detail?: unknown }).detail === 'string'
        ? (json as { detail: string }).detail
        : res.status === 502
          ? 'The Parshlo API is not running. Restart `make dev`.'
          : res.statusText;
    const problem: z.infer<typeof ApiErrorResponse> = parsed.success
      ? parsed.data
      : {
          type: 'about:blank',
          title: res.statusText,
          status: res.status,
          code: 'UNKNOWN_ERROR',
          detail: fallbackDetail,
        };
    throw new ApiError(res.status, problem);
  }

  const json: unknown = await res.json();
  return OrderView.parse(json);
}

// ─── Logistics Finance API ────────────────────────────────────────────────────

const CourierPartnerRow = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});
export const CourierPartnerList = z.array(CourierPartnerRow);
export type CourierPartner = z.infer<typeof CourierPartnerRow>;

export const ConsignmentRow = z.object({
  id: z.string(),
  courierId: z.string(),
  courier: z.object({ name: z.string() }),
  type: z.string(),
  docketNumber: z.string(),
  consignmentDate: z.string(),
  amountPaise: z.union([z.string(), z.number()]),
  weightKg: z.number().nullable(),
  boxCount: z.number(),
  status: z.string(),
  statementId: z.string().nullable(),
  statement: z.object({ status: z.string() }).nullable().optional(),
  associatedOrderNumber: z.string().nullable(),
  associatedPoNumber: z.string().nullable(),
});
export const ConsignmentList = z.array(ConsignmentRow);
export type Consignment = z.infer<typeof ConsignmentRow>;

export const StatementRow = z.object({
  id: z.string(),
  courierId: z.string(),
  courier: z.object({ name: z.string() }),
  statementInvoiceNumber: z.string(),
  billingPeriodStart: z.string(),
  billingPeriodEnd: z.string(),
  courierChargedTotalPaise: z.union([z.string(), z.number()]),
  systemCalculatedTotalPaise: z.union([z.string(), z.number()]),
  status: z.string(),
  note: z.string().nullable(),
  _count: z.object({ consignments: z.number() }),
});
export const StatementList = z.array(StatementRow);
export type LogisticsStatement = z.infer<typeof StatementRow>;

export function listCourierPartners(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<CourierPartner[]> {
  return apiCall('/v1/admin/finance/logistics/couriers', CourierPartnerList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function listLogisticsConsignments(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<Consignment[]> {
  return apiCall('/v1/admin/finance/logistics/consignments', ConsignmentList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function listLogisticsStatements(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<LogisticsStatement[]> {
  return apiCall('/v1/admin/finance/logistics/statements', StatementList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}
