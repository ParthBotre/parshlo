import { SetMetadata } from '@nestjs/common';
import { type Role } from '@parshlo/types';

export const ROLES_KEY = 'parshlo:roles';

/**
 * Require the principal to hold AT LEAST ONE of the given roles.
 *
 * @example
 *   @RequireRoles('ADMIN', 'SUPER_ADMIN')
 *   @Get('admin/users')
 *   list() { ... }
 */
export const RequireRoles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
