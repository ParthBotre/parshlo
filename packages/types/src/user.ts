import { z } from 'zod';

import { Role } from './auth.js';
import { IsoDateString, Uuid } from './common.js';

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
  id: Uuid,
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
