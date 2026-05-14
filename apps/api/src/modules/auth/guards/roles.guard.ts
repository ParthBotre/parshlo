import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Role } from '@parshlo/types';

import { ROLES_KEY } from '../../../common/decorators/roles.decorator.js';
import { type AuthenticatedRequest } from '../../../common/types/request.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }

    const ok = req.user.roles.some((r) => required.includes(r));
    if (!ok) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE',
        message: `Requires one of: ${required.join(', ')}`,
      });
    }
    return true;
  }
}
