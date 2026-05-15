import { ApiErrorResponse, type B2BApplicationInput } from '@parshlo/types';
import { z } from 'zod';

import { apiCall, ApiError } from '../api-client';

const ApplicationResponse = z.object({ applicationId: z.string() });

export type B2BApplicationPayload = B2BApplicationInput;

const API_BASE =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

/** Server-only: forward to NestJS. */
export function submitB2BApplicationToApi(
  body: B2BApplicationPayload,
): Promise<z.infer<typeof ApplicationResponse>> {
  return apiCall('/v1/kyc/apply', ApplicationResponse, {
    method: 'POST',
    body,
    baseUrl: API_BASE,
  });
}

/**
 * Browser-safe submit via same-origin Next.js route (avoids CORS / connection issues).
 */
export async function submitB2BApplication(
  body: B2BApplicationPayload,
): Promise<z.infer<typeof ApplicationResponse>> {
  const res = await fetch('/api/kyc/apply', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as unknown;
    const parsed = ApiErrorResponse.safeParse(json);
    const fallbackDetail =
      json &&
      typeof json === 'object' &&
      'detail' in json &&
      typeof (json as { detail?: unknown }).detail === 'string'
        ? (json as { detail: string }).detail
        : res.status === 502
          ? 'The Parshlo API is not running. Restart `make dev` and ensure port 4000 is listening.'
          : res.statusText;
    const problem: z.infer<typeof ApiErrorResponse> = parsed.success
      ? parsed.data
      : {
          type: 'about:blank',
          title: res.statusText,
          status: res.status,
          code: 'UNKNOWN_ERROR',
          detail: fallbackDetail,
        };
    throw new ApiError(res.status, problem);
  }

  const json: unknown = await res.json();
  return ApplicationResponse.parse(json);
}
