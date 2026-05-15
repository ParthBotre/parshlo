import {
  ApiErrorResponse,
  OrderView,
  type PlaceOrderInput,
  type UpdateOrderStatusInput,
} from '@parshlo/types';
import { z } from 'zod';

import { apiCall, ApiError, type ApiCallOptions } from '../api-client';

const OrderList = z.array(OrderView);

export function placeOrder(
  accessToken: string,
  input: PlaceOrderInput,
  options: Pick<ApiCallOptions, 'baseUrl'> = {},
): Promise<z.infer<typeof OrderView>> {
  return apiCall('/v1/orders', OrderView, {
    method: 'POST',
    accessToken,
    body: input,
    idempotencyKey: input.idempotencyKey,
    ...options,
  });
}

/** Browser-safe checkout via same-origin Next.js route (session + API on the server). */
export async function placeOrderFromBrowser(
  input: Omit<PlaceOrderInput, 'idempotencyKey'> & { idempotencyKey?: string },
): Promise<z.infer<typeof OrderView>> {
  const body: PlaceOrderInput = {
    ...input,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
  };

  const res = await fetch('/api/orders', {
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
          ? 'The Parshlo API is not running. Restart `make dev`.'
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
  return OrderView.parse(json);
}

export function listMyOrders(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof OrderList>> {
  return apiCall('/v1/orders', OrderList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function getOrder(
  accessToken: string,
  id: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof OrderView>> {
  return apiCall(`/v1/orders/${encodeURIComponent(id)}`, OrderView, {
    method: 'GET',
    accessToken,
    ...options,
  });
}

export function updateOrderStatus(
  accessToken: string,
  id: string,
  input: UpdateOrderStatusInput,
): Promise<z.infer<typeof OrderView>> {
  return apiCall(`/v1/orders/${encodeURIComponent(id)}/status`, OrderView, {
    method: 'PATCH',
    accessToken,
    body: input,
  });
}
