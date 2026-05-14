import { OrderView, type PlaceOrderInput, type UpdateOrderStatusInput } from '@parshlo/types';
import { z } from 'zod';

import { apiCall, type ApiCallOptions } from '../api-client';

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
