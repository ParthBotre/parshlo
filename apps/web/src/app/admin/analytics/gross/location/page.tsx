import { ArrowLeft } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { loadMonthOrdersForAnalytics } from '@/lib/admin-gross-analytics';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { dateInputKeyIst } from '@/lib/format-datetime';
import {
  aggregateSalesByBuyerInLocation,
  type BuyerPeriodRanges,
  type SalesPeriodRange,
} from '@/lib/sales-by-city';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Sales by buyer',
  robots: { index: false, follow: false },
};

const PERIODS = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
] as const;

type Period = (typeof PERIODS)[number]['key'];

interface PageProps {
  searchParams: Promise<{ city?: string; state?: string; period?: string; anchor?: string }>;
}

function isPeriod(value: string | undefined): value is Period {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year';
}

function todayKey(): string {
  return dateInputKeyIst();
}

function defaultAnchor(period: Period): string {
  const today = todayKey();
  if (period === 'month') return today.slice(0, 7);
  if (period === 'year') return today.slice(0, 4);
  return today;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function businessDateIso(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}T00:00:00.000+05:30`;
}

function parseAnchorDate(anchor: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw = '1', dayRaw = '1'] = anchor.split('-');
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
    day: Number(dayRaw),
  };
}

function normalizeAnchor(period: Period, anchor: string | undefined): string {
  const fallback = defaultAnchor(period);
  if (!anchor) return fallback;
  if (period === 'year') return /^\d{4}$/.test(anchor) ? anchor : fallback;
  if (period === 'month') return /^\d{4}-\d{2}$/.test(anchor) ? anchor : fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : fallback;
}

function rangeForPeriod(period: Period, anchor: string): SalesPeriodRange {
  const parts = parseAnchorDate(anchor);

  if (period === 'day') {
    const start = new Date(businessDateIso(parts.year, parts.month, parts.day));
    return { start, end: addDays(start, 1) };
  }

  if (period === 'week') {
    const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const day = calendarDate.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(calendarDate);
    monday.setUTCDate(calendarDate.getUTCDate() + mondayOffset);
    const start = new Date(
      businessDateIso(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate()),
    );
    return { start, end: addDays(start, 7) };
  }

  if (period === 'month') {
    const start = new Date(businessDateIso(parts.year, parts.month, 1));
    const endMonth = parts.month === 12 ? 1 : parts.month + 1;
    const endYear = parts.month === 12 ? parts.year + 1 : parts.year;
    return { start, end: new Date(businessDateIso(endYear, endMonth, 1)) };
  }

  const start = new Date(businessDateIso(parts.year, 1, 1));
  return { start, end: new Date(businessDateIso(parts.year + 1, 1, 1)) };
}

function rangeAnchorDate(period: Period, anchor: string): string {
  if (period === 'month') return `${anchor}-01`;
  if (period === 'year') return `${anchor}-01-01`;
  return anchor;
}

function periodRangesForAnchor(period: Period, anchor: string): BuyerPeriodRanges {
  const base = rangeAnchorDate(period, anchor);
  return {
    day: rangeForPeriod('day', base),
    week: rangeForPeriod('week', base),
    month: rangeForPeriod('month', base.slice(0, 7)),
    year: rangeForPeriod('year', base.slice(0, 4)),
  };
}

function inputType(period: Period): 'date' | 'month' | 'number' {
  if (period === 'month') return 'month';
  if (period === 'year') return 'number';
  return 'date';
}

function cityHref(city: string, period: Period, anchor: string): string {
  const params = new URLSearchParams({ city, period, anchor });
  return `/admin/analytics/gross/location?${params.toString()}`;
}

export default async function GrossSalesLocationDetailPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const {
    city: cityParam,
    state: stateParam,
    period: rawPeriod,
    anchor: rawAnchor,
  } = await searchParams;
  if (!cityParam?.trim()) {
    notFound();
  }

  const city = cityParam.trim();
  const state = stateParam?.trim();
  const period = isPeriod(rawPeriod) ? rawPeriod : 'month';
  const anchor = normalizeAnchor(period, rawAnchor);
  const selectedRange = rangeForPeriod(period, anchor);
  const periodRanges = periodRangesForAnchor(period, anchor);

  let orders: Awaited<ReturnType<typeof loadMonthOrdersForAnalytics>>['orders'] = [];
  let monthStart = '';
  try {
    const loaded = await loadMonthOrdersForAnalytics(session.accessToken);
    orders = loaded.orders;
    monthStart = loaded.monthStart;
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  const report = aggregateSalesByBuyerInLocation(
    orders,
    city,
    state,
    monthStart,
    selectedRange,
    periodRanges,
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      <Link
        href="/admin/analytics/gross"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Sales analytics
      </Link>

      <div>
        <h1 className="font-display break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          {report.city}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Buyers who purchased in this city for the selected period.
        </p>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="space-y-4 p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="bg-secondary/50 flex w-full max-w-full overflow-x-auto rounded-md p-1 sm:w-auto">
              {PERIODS.map((p) => (
                <Link
                  key={p.key}
                  href={cityHref(city, p.key, defaultAnchor(p.key))}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
            <form method="get" className="grid w-full max-w-full gap-2 sm:flex sm:items-end">
              <input type="hidden" name="city" value={city} />
              <input type="hidden" name="period" value={period} />
              <label className="text-muted-foreground grid gap-1 text-xs font-medium">
                Period
                <input
                  type={inputType(period)}
                  name="anchor"
                  defaultValue={anchor}
                  min={period === 'year' ? '2000' : undefined}
                  max={period === 'year' ? '2100' : undefined}
                  className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-44"
                />
              </label>
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-full rounded-md px-4 text-sm font-medium sm:w-auto"
              >
                Apply
              </button>
            </form>
          </div>
        </CardContent>
      </Card>

      <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">City gross</p>
            <p className="font-display mt-1 text-2xl font-semibold">
              {formatINR(report.totalGrossPaise)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Orders</p>
            <p className="font-display mt-1 text-2xl font-semibold">{report.totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Gross</th>
                  <th className="px-5 py-3 text-right">Daily</th>
                  <th className="px-5 py-3 text-right">Weekly</th>
                  <th className="px-5 py-3 text-right">Monthly</th>
                  <th className="px-5 py-3 text-right">Yearly</th>
                  <th className="px-5 py-3">Share in city</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-muted-foreground p-10 text-center text-sm">
                      No buyers bought in this city for the selected period.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr key={row.buyerId ?? row.gstin} className="border-t">
                      <td className="max-w-[260px] whitespace-normal break-words px-5 py-3">
                        {row.buyerId ? (
                          <Link
                            href={`/admin/buyers/${row.buyerId}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {row.businessName}
                          </Link>
                        ) : (
                          <p className="font-medium">{row.businessName}</p>
                        )}
                        {row.contactName !== row.businessName ? (
                          <p className="text-muted-foreground text-xs">{row.contactName}</p>
                        ) : null}
                      </td>
                      <td className="text-muted-foreground whitespace-nowrap px-5 py-3 font-mono text-xs">
                        {row.gstin}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        {row.orderCount}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        {formatINR(row.grossPaise)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        {formatINR(row.dayGrossPaise)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        {formatINR(row.weekGrossPaise)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        {formatINR(row.monthGrossPaise)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                        {formatINR(row.yearGrossPaise)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex min-w-[140px] items-center gap-2">
                          <div className="bg-secondary h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${Math.min(row.sharePercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-10 shrink-0 text-right font-mono text-xs">
                            {row.sharePercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
