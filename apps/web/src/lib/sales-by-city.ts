export interface SalesByCityRow {
  city: string;
  state: string;
  orderCount: number;
  grossPaise: number;
  sharePercent: number;
}

export interface SalesByCityReport {
  monthStart: string;
  totalGrossPaise: number;
  totalOrders: number;
  rows: SalesByCityRow[];
}

export function utcMonthStartIso(): string {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

function isInUtcMonth(placedAtIso: string, monthStartIso: string): boolean {
  return new Date(placedAtIso).getTime() >= new Date(monthStartIso).getTime();
}

/** Build city breakdown from admin order rows (fallback when summary.salesByCity is absent). */
export function aggregateSalesByCityFromOrders(
  orders: readonly {
    placedAt: string;
    totalPaise: number;
    buyerCity?: string;
    buyerState?: string;
  }[],
  monthStartIso: string = utcMonthStartIso(),
): SalesByCityReport {
  const monthOrders = orders.filter((o) => isInUtcMonth(o.placedAt, monthStartIso));

  const buckets = new Map<
    string,
    { city: string; state: string; orderCount: number; grossPaise: number }
  >();

  for (const order of monthOrders) {
    const city = order.buyerCity?.trim() ?? 'Unknown';
    const state = order.buyerState?.trim() ?? 'Unknown';
    const key = `${city}\0${state}`;
    const existing = buckets.get(key) ?? { city, state, orderCount: 0, grossPaise: 0 };
    existing.orderCount += 1;
    existing.grossPaise += order.totalPaise;
    buckets.set(key, existing);
  }

  const totalGrossPaise = monthOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalOrders = monthOrders.length;

  const rows = [...buckets.values()]
    .map((row) => ({
      city: row.city,
      state: row.state,
      orderCount: row.orderCount,
      grossPaise: row.grossPaise,
      sharePercent:
        totalGrossPaise > 0 ? Math.round((row.grossPaise * 1000) / totalGrossPaise) / 10 : 0,
    }))
    .sort((a, b) => b.grossPaise - a.grossPaise);

  return {
    monthStart: monthStartIso,
    totalGrossPaise,
    totalOrders,
    rows,
  };
}

export interface SalesByBuyerRow {
  businessName: string;
  contactName: string;
  gstin: string;
  orderCount: number;
  grossPaise: number;
  sharePercent: number;
}

export interface SalesByBuyerInLocationReport {
  city: string;
  state: string;
  monthStart: string;
  totalGrossPaise: number;
  totalOrders: number;
  rows: SalesByBuyerRow[];
}

export interface OrderForSalesAnalytics {
  placedAt: string;
  totalPaise: number;
  buyerBusinessName: string;
  buyerFullName?: string;
  buyerGstin: string;
  buyerCity?: string;
  buyerState?: string;
}

function normalizeLocationPart(value: string | undefined): string {
  return value?.trim() ?? 'Unknown';
}

function locationKey(city: string | undefined, state: string | undefined): string {
  return `${normalizeLocationPart(city)}\0${normalizeLocationPart(state)}`;
}

/** Buyers and gross share within one city/state for the current UTC month. */
export function aggregateSalesByBuyerInLocation(
  orders: readonly OrderForSalesAnalytics[],
  city: string,
  state: string,
  monthStartIso: string = utcMonthStartIso(),
): SalesByBuyerInLocationReport {
  const targetKey = locationKey(city, state);
  const cityNorm = normalizeLocationPart(city);
  const stateNorm = normalizeLocationPart(state);

  const monthOrders = orders.filter((o) => {
    if (!isInUtcMonth(o.placedAt, monthStartIso)) {
      return false;
    }
    return locationKey(o.buyerCity, o.buyerState) === targetKey;
  });

  const buckets = new Map<
    string,
    {
      businessName: string;
      contactName: string;
      gstin: string;
      orderCount: number;
      grossPaise: number;
    }
  >();

  for (const order of monthOrders) {
    const gstinTrimmed = order.buyerGstin.trim();
    const gstin = gstinTrimmed.length > 0 ? gstinTrimmed : '—';
    const businessTrimmed = order.buyerBusinessName.trim();
    const businessName = businessTrimmed.length > 0 ? businessTrimmed : 'Unknown buyer';
    const contactName = order.buyerFullName?.trim() ?? businessName;
    const key = gstin !== '—' ? gstin : businessName;
    const existing = buckets.get(key) ?? {
      businessName,
      contactName,
      gstin,
      orderCount: 0,
      grossPaise: 0,
    };
    existing.orderCount += 1;
    existing.grossPaise += order.totalPaise;
    buckets.set(key, existing);
  }

  const totalGrossPaise = monthOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalOrders = monthOrders.length;

  const rows = [...buckets.values()]
    .map((row) => ({
      businessName: row.businessName,
      contactName: row.contactName,
      gstin: row.gstin,
      orderCount: row.orderCount,
      grossPaise: row.grossPaise,
      sharePercent:
        totalGrossPaise > 0 ? Math.round((row.grossPaise * 1000) / totalGrossPaise) / 10 : 0,
    }))
    .sort((a, b) => b.grossPaise - a.grossPaise);

  return {
    city: cityNorm,
    state: stateNorm,
    monthStart: monthStartIso,
    totalGrossPaise,
    totalOrders,
    rows,
  };
}

export function locationDetailHref(city: string, state: string): string {
  const params = new URLSearchParams({ city, state });
  return `/admin/analytics/gross/location?${params.toString()}`;
}
