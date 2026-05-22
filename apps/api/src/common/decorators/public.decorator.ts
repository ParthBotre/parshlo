import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'parshlo:isPublic';

/**
 * Mark an endpoint as public (skips the JWT auth guard).
 * Use sparingly — explicit by default.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
