import { z } from 'zod';

/**
 * Roles enforced via RBAC. Mirror this exact set in the API and DB.
 * NOTE: Public visitors are NOT a role — they are unauthenticated users.
 */
export const Role = z.enum([
  'BUYER', // Verified B2B buyer (pharmacy, chemist, distributor, hospital, stockist, wholesaler)
  'SALES_MANAGER', // Internal: monitors orders/accounts
  'ADMIN', // Internal: full administrative control
  'SUPER_ADMIN', // Reserved for platform owners (break-glass)
]);
export type Role = z.infer<typeof Role>;

/** Fine-grained permissions used by `@RequirePermissions(...)`. */
export const Permission = z.enum([
  // KYC / users
  'kyc:approve',
  'kyc:reject',
  'kyc:read',
  'user:read',
  'user:suspend',
  'user:update_role',
  // Products
  'product:create',
  'product:update',
  'product:delete',
  'product:read_internal',
  // Orders
  'order:read_all',
  'order:update_status',
  'order:cancel_any',
  // Admin
  'audit:read',
  'analytics:read',
]);
export type Permission = z.infer<typeof Permission>;

/** Default permission set per role — single source of truth. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  BUYER: [],
  SALES_MANAGER: ['kyc:read', 'user:read', 'order:read_all', 'analytics:read'],
  ADMIN: [
    'kyc:approve',
    'kyc:reject',
    'kyc:read',
    'user:read',
    'user:suspend',
    'product:create',
    'product:update',
    'product:delete',
    'product:read_internal',
    'order:read_all',
    'order:update_status',
    'order:cancel_any',
    'audit:read',
    'analytics:read',
  ],
  SUPER_ADMIN: Permission.options, // all
};

/** Decoded JWT claims we trust from Auth0. */
export const AccessTokenClaims = z.object({
  sub: z.string(), // Auth0 user id, e.g. "auth0|..."
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  'https://parshlo.com/roles': z.array(Role).default([]),
  'https://parshlo.com/permissions': z.array(Permission).default([]),
  'https://parshlo.com/user_id': z.string().uuid().optional(), // internal user id, set by Auth0 post-login Action
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  scope: z.string().optional(),
});
export type AccessTokenClaims = z.infer<typeof AccessTokenClaims>;

/** Authenticated request principal exposed to controllers. */
export interface AuthPrincipal {
  auth0Id: string;
  userId: string;
  email: string | undefined;
  roles: Role[];
  permissions: Permission[];
}
