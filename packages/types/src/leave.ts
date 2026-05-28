import { z } from 'zod';

import { EntityId, IsoDateString } from './common.js';

export const LeaveRequestStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
export type LeaveRequestStatus = z.infer<typeof LeaveRequestStatus>;

export const LeaveDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Use YYYY-MM-DD date format.',
});
export type LeaveDateString = z.infer<typeof LeaveDateString>;

export const EmployeeLeaveRequestView = z.object({
  id: EntityId,
  employeeId: EntityId,
  employeeName: z.string(),
  employeeEmail: z.string().email(),
  startDate: LeaveDateString,
  endDate: LeaveDateString,
  dayCount: z.number().int().positive(),
  reason: z.string().nullable(),
  status: LeaveRequestStatus,
  reviewedById: EntityId.nullable(),
  reviewedByName: z.string().nullable(),
  reviewedAt: IsoDateString.nullable(),
  reviewerNote: z.string().nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type EmployeeLeaveRequestView = z.infer<typeof EmployeeLeaveRequestView>;

export const EmployeeLeaveBalanceView = z.object({
  employeeId: EntityId,
  year: z.number().int(),
  entitlementDays: z.number().int().positive(),
  approvedDays: z.number().int().nonnegative(),
  pendingDays: z.number().int().nonnegative(),
  remainingDays: z.number().int().nonnegative(),
});
export type EmployeeLeaveBalanceView = z.infer<typeof EmployeeLeaveBalanceView>;

export const EmployeeLeaveDashboardView = z.object({
  currentUserId: EntityId,
  canReview: z.boolean(),
  balance: EmployeeLeaveBalanceView,
  requests: z.array(EmployeeLeaveRequestView),
});
export type EmployeeLeaveDashboardView = z.infer<typeof EmployeeLeaveDashboardView>;

export const CreateLeaveRequestInputSchema = z
  .object({
    startDate: LeaveDateString,
    endDate: LeaveDateString,
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'End date must be on or after start date.',
    path: ['endDate'],
  });
export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestInputSchema>;

export const ReviewLeaveRequestInputSchema = z.object({
  status: LeaveRequestStatus.extract(['APPROVED', 'REJECTED']),
  reviewerNote: z.string().trim().max(500).optional().nullable(),
});
export type ReviewLeaveRequestInput = z.infer<typeof ReviewLeaveRequestInputSchema>;
