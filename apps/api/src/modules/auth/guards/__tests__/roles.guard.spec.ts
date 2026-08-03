import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../../../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../roles.guard.js';

function makeCtx(user: { roles: string[] } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => () => undefined,
    getClass: () => function noop() {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeCtx({ roles: ['BUYER'] }))).toBe(true);
  });

  it('rejects unauthenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(makeCtx(undefined))).toThrow(ForbiddenException);
  });

  it('rejects insufficient role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(makeCtx({ roles: ['BUYER'] }))).toThrow(ForbiddenException);
  });

  it('accepts when one matching role is present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'SUPER_ADMIN']);
    expect(guard.canActivate(makeCtx({ roles: ['ADMIN'] }))).toBe(true);
  });

  it('reads metadata under the ROLES_KEY', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    guard.canActivate(makeCtx({ roles: ['ADMIN'] }));
    expect(spy.mock.calls[0]![0]).toBe(ROLES_KEY);
  });
});
