import { ApiErrorResponse } from '@parshlo/types';
import { z, type ZodSchema } from 'zod';

/**
 * Typed API client for the Parshlo NestJS backend.
 *
 * Design:
 *   - Every call validates the response shape with a Zod schema imported from
 *     @parshlo/types. If the API drifts, the call throws at the boundary
 *     instead of silently propagating bad data into React.
 *   - Errors come back as RFC 7807 problem details from the API; we surface
 *     them as `ApiError` with the typed envelope.
 *   - `fetch` is used directly so this works in RSC, route handlers, server
 *     actions, and the browser. No isomorphic-fetch shim needed.
 */

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000';

export interface ApiCallOptions extends Omit<RequestInit, 'body'> {
  /** Pre-serialized body or a plain object that will be JSON-stringified. */
  body?: BodyInit | Record<string, unknown> | undefined;
  /** Idempotency-Key for mutating endpoints that support it. */
  idempotencyKey?: string;
  /** Bearer token for authenticated requests (server-side / RSC). */
  accessToken?: string;
  /** Override the base URL (used by tests). */
  baseUrl?: string;
  /** Pass-through to fetch's next-data caching options. */
  next?: NextFetchRequestConfig;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: z.infer<typeof ApiErrorResponse>,
  ) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }
}

export async function apiCall<T>(
  path: string,
  schema: ZodSchema<T>,
  options: ApiCallOptions = {},
): Promise<T> {
  const url = new URL(path, options.baseUrl ?? DEFAULT_BASE).toString();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob) &&
    !(options.body instanceof ArrayBuffer)
  ) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }
  if (options.accessToken) {
    headers.set('Authorization', `Bearer ${options.accessToken}`);
  }

  let bodyInit: BodyInit | undefined;
  if (options.body !== undefined) {
    bodyInit =
      typeof options.body === 'string' ||
      options.body instanceof FormData ||
      options.body instanceof Blob ||
      options.body instanceof ArrayBuffer
        ? (options.body as BodyInit)
        : JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body: bodyInit,
    next: options.next,
  });

  if (!res.ok) {
    let problem: z.infer<typeof ApiErrorResponse> = {
      type: 'about:blank',
      title: res.statusText,
      status: res.status,
      code: 'UNKNOWN_ERROR',
    };
    try {
      const json = (await res.json()) as unknown;
      const parsed = ApiErrorResponse.safeParse(json);
      if (parsed.success) {
        problem = parsed.data;
      }
    } catch {
      // ignore — keep default problem
    }
    throw new ApiError(res.status, problem);
  }

  if (res.status === 204) {
    const empty = schema.safeParse(undefined);
    if (empty.success) {
      return empty.data;
    }
    return undefined as T;
  }

  const json: unknown = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

/** Helper for endpoints that return a paginated envelope. */
export function PaginatedOf<T extends ZodSchema>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });
}
