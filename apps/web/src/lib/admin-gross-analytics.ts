import { getAnalyticsSummary, getSalesByCity, listAllOrders } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import {
  aggregateSalesByCityFromOrders,
  type OrderForSalesAnalytics,
  type SalesByCityReport,
  utcMonthStartIso,
} from '@/lib/sales-by-city';

/** Orders for the current UTC month (with location fields when the API provides them). */
export async function loadMonthOrdersForAnalytics(
  accessToken: string,
): Promise<{ monthStart: string; orders: OrderForSalesAnalytics[] }> {
  const monthStart = utcMonthStartIso();

  try {
    const orders = await listAllOrders(accessToken, {}, { next: { revalidate: 0 } });
    return { monthStart, orders };
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  return { monthStart, orders: [] };
}

export async function loadGrossSalesByCityReport(
  accessToken: string,
): Promise<{ monthStart: string; breakdown: SalesByCityReport | undefined }> {
  const monthStart = utcMonthStartIso();

  let breakdown: SalesByCityReport | undefined;

  try {
    const summary = await getAnalyticsSummary(accessToken, { next: { revalidate: 0 } });
    breakdown = summary.salesByCity;
    if (!breakdown && summary.ordersThisMonth > 0) {
      const { orders } = await loadMonthOrdersForAnalytics(accessToken);
      if (orders.length > 0) {
        breakdown = aggregateSalesByCityFromOrders(orders, monthStart);
      }
    }
    if (breakdown) {
      return { monthStart, breakdown };
    }
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  try {
    breakdown = await getSalesByCity(accessToken, { next: { revalidate: 0 } });
    return { monthStart, breakdown };
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  const { orders } = await loadMonthOrdersForAnalytics(accessToken);
  if (orders.length > 0) {
    breakdown = aggregateSalesByCityFromOrders(orders, monthStart);
  }

  return { monthStart, breakdown };
}
