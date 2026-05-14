import { type ExecutionContext, createParamDecorator } from '@nestjs/common';

import { type AuthenticatedRequest } from '../types/request.js';

/**
 * Inject the authenticated principal into a controller method.
 *
 * @example
 *   @Get('me')
 *   me(@CurrentUser() user: AuthPrincipal) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return req.user;
  },
);
