import { z } from 'zod';

import { Role } from './auth.js';
import { EntityId, IsoDateString } from './common.js';

/** Lifecycle of a B2B account. */
export const AccountStatus = z.enum([
  'PENDING_VERIFICATION',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
]);
export type AccountStatus = z.infer<typeof AccountStatus>;

/** Type of business entity registering as a B2B buyer. */
export const BusinessType = z.enum([
  'PHARMACY',
  'CHEMIST',
  'STOCKIST',
  'DISTRIBUTOR',
  'HOSPITAL',
  'WHOLESALER',
]);
export type BusinessType = z.infer<typeof BusinessType>;

/** Public user profile (safe to expose). */
export const PublicUser = z.object({
  id: EntityId,
  email: z.string().email(),
  fullName: z.string().min(1),
  roles: z.array(Role),
  accountStatus: AccountStatus,
  createdAt: IsoDateString,
});
export type PublicUser = z.infer<typeof PublicUser>;

/** Admin-only view of user data, including KYC + business details. */
export const AdminUserView = PublicUser.extend({
  auth0Id: z.string(),
  suspendedAt: IsoDateString.nullable(),
  suspensionReason: z.string().nullable(),
  lastLoginAt: IsoDateString.nullable(),
  lastLoginIp: z.string().nullable(),
});
export type AdminUserView = z.infer<typeof AdminUserView>;

export const EmployeeRole = Role.extract(['SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
export type EmployeeRole = z.infer<typeof EmployeeRole>;

export const AdminEmployeeView = AdminUserView.extend({
  primaryRole: EmployeeRole,
});
export type AdminEmployeeView = z.infer<typeof AdminEmployeeView>;

export const AdminCreateEmployeeInputSchema = z.object({
  email: z.string().trim().email().max(320),
  fullName: z.string().trim().min(2).max(160),
  role: EmployeeRole,
  accountStatus: AccountStatus.extract(['APPROVED', 'SUSPENDED']).default('APPROVED'),
});
export type AdminCreateEmployeeInput = z.infer<typeof AdminCreateEmployeeInputSchema>;

export const AdminUpdateEmployeeInputSchema = z
  .object({
    fullName: z.string().trim().min(2).max(160).optional(),
    role: EmployeeRole.optional(),
    accountStatus: AccountStatus.extract(['APPROVED', 'SUSPENDED']).optional(),
    suspensionReason: z.string().trim().max(500).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one employee field must be changed.',
  });
export type AdminUpdateEmployeeInput = z.infer<typeof AdminUpdateEmployeeInputSchema>;
