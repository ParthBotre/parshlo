import { BuyerProductView, PublicProductView } from '@parshlo/types';
import { z } from 'zod';

import { apiCall, type ApiCallOptions } from '../api-client';

const PublicProductList = z.array(PublicProductView);
const BuyerProductList = z.array(BuyerProductView);

/** Public, unauthenticated, no pricing exposed. */
export function listPublicProducts(
  options: Pick<ApiCallOptions, 'cache' | 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof PublicProductList>> {
  return apiCall('/v1/products/public', PublicProductList, {
    method: 'GET',
    ...options,
  });
}

export function getPublicProduct(
  slug: string,
  options: Pick<ApiCallOptions, 'cache' | 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof PublicProductView>> {
  return apiCall(`/v1/products/public/${encodeURIComponent(slug)}`, PublicProductView, {
    method: 'GET',
    ...options,
  });
}

/** Verified buyer catalog — requires Bearer token and APPROVED account. */
export function listBuyerCatalog(
  accessToken: string,
  options: Pick<ApiCallOptions, 'next' | 'baseUrl'> = {},
): Promise<z.infer<typeof BuyerProductList>> {
  return apiCall('/v1/products/catalog', BuyerProductList, {
    method: 'GET',
    accessToken,
    ...options,
  });
}
