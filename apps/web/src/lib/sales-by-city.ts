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
  buyerId: string | null;
  businessName: string;
  contactName: string;
  gstin: string;
  orderCount: number;
  grossPaise: number;
  sharePercent: number;
  dayGrossPaise: number;
  weekGrossPaise: number;
  monthGrossPaise: number;
  yearGrossPaise: number;
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
  buyerId?: string;
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

function cityKey(city: string | undefined): string {
  return normalizeLocationPart(city).toLocaleUpperCase('en-IN');
}

export interface SalesPeriodRange {
  start: Date;
  end: Date;
}

export interface BuyerPeriodRanges {
  day: SalesPeriodRange;
  week: SalesPeriodRange;
  month: SalesPeriodRange;
  year: SalesPeriodRange;
}

function isInRange(placedAtIso: string, range: SalesPeriodRange): boolean {
  const placedAt = new Date(placedAtIso).getTime();
  return placedAt >= range.start.getTime() && placedAt < range.end.getTime();
}

/** Buyers and gross share within one city/state for the current UTC month. */
export function aggregateSalesByBuyerInLocation(
  orders: readonly OrderForSalesAnalytics[],
  city: string,
  state: string | undefined,
  monthStartIso: string = utcMonthStartIso(),
  selectedRange?: SalesPeriodRange,
  periodRanges?: BuyerPeriodRanges,
): SalesByBuyerInLocationReport {
  const targetCityKey = cityKey(city);
  const cityNorm = normalizeLocationPart(city);
  const stateNorm = normalizeLocationPart(state);
  const range = selectedRange ?? { start: new Date(monthStartIso), end: new Date() };

  const cityOrders = orders.filter((o) => cityKey(o.buyerCity) === targetCityKey);
  const selectedOrders = cityOrders.filter((o) => isInRange(o.placedAt, range));

  const buckets = new Map<
    string,
    {
      buyerId: string | null;
      businessName: string;
      contactName: string;
      gstin: string;
      orderCount: number;
      grossPaise: number;
      dayGrossPaise: number;
      weekGrossPaise: number;
      monthGrossPaise: number;
      yearGrossPaise: number;
    }
  >();

  for (const order of selectedOrders) {
    const gstinTrimmed = order.buyerGstin.trim();
    const gstin = gstinTrimmed.length > 0 ? gstinTrimmed : '—';
    const businessTrimmed = order.buyerBusinessName.trim();
    const businessName = businessTrimmed.length > 0 ? businessTrimmed : 'Unknown buyer';
    const contactName = order.buyerFullName?.trim() ?? businessName;
    const key = order.buyerId ?? (gstin !== '—' ? gstin : businessName);
    const existing = buckets.get(key) ?? {
      buyerId: order.buyerId ?? null,
      businessName,
      contactName,
      gstin,
      orderCount: 0,
      grossPaise: 0,
      dayGrossPaise: 0,
      weekGrossPaise: 0,
      monthGrossPaise: 0,
      yearGrossPaise: 0,
    };
    existing.orderCount += 1;
    existing.grossPaise += order.totalPaise;
    buckets.set(key, existing);
  }

  if (periodRanges) {
    for (const order of cityOrders) {
      const gstinTrimmed = order.buyerGstin.trim();
      const gstin = gstinTrimmed.length > 0 ? gstinTrimmed : '—';
      const businessTrimmed = order.buyerBusinessName.trim();
      const businessName = businessTrimmed.length > 0 ? businessTrimmed : 'Unknown buyer';
      const contactName = order.buyerFullName?.trim() ?? businessName;
      const key = order.buyerId ?? (gstin !== '—' ? gstin : businessName);
      const existing = buckets.get(key) ?? {
        buyerId: order.buyerId ?? null,
        businessName,
        contactName,
        gstin,
        orderCount: 0,
        grossPaise: 0,
        dayGrossPaise: 0,
        weekGrossPaise: 0,
        monthGrossPaise: 0,
        yearGrossPaise: 0,
      };
      if (isInRange(order.placedAt, periodRanges.day)) existing.dayGrossPaise += order.totalPaise;
      if (isInRange(order.placedAt, periodRanges.week)) existing.weekGrossPaise += order.totalPaise;
      if (isInRange(order.placedAt, periodRanges.month))
        existing.monthGrossPaise += order.totalPaise;
      if (isInRange(order.placedAt, periodRanges.year)) existing.yearGrossPaise += order.totalPaise;
      buckets.set(key, existing);
    }
  }

  const totalGrossPaise = selectedOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const totalOrders = selectedOrders.length;

  const rows = [...buckets.values()]
    .filter(
      (row) =>
        row.orderCount > 0 ||
        row.dayGrossPaise > 0 ||
        row.weekGrossPaise > 0 ||
        row.monthGrossPaise > 0 ||
        row.yearGrossPaise > 0,
    )
    .map((row) => ({
      buyerId: row.buyerId,
      businessName: row.businessName,
      contactName: row.contactName,
      gstin: row.gstin,
      orderCount: row.orderCount,
      grossPaise: row.grossPaise,
      sharePercent:
        totalGrossPaise > 0 ? Math.round((row.grossPaise * 1000) / totalGrossPaise) / 10 : 0,
      dayGrossPaise: row.dayGrossPaise,
      weekGrossPaise: row.weekGrossPaise,
      monthGrossPaise: row.monthGrossPaise,
      yearGrossPaise: row.yearGrossPaise,
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
