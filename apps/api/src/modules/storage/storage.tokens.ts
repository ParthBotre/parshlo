/**
 * DI tokens for the Storage module.
 *
 * Lives in its own file to avoid a circular import between `storage.module.ts`
 * (which imports StorageService) and `storage.service.ts` (which needs the
 * token to `@Inject(...)` the S3 client). Pulling tokens out breaks the cycle.
 */
export const S3_CLIENT = Symbol('S3_CLIENT');
