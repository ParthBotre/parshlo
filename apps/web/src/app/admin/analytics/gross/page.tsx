import { ArrowLeft } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { getSalesAnalytics } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { dateInputKeyIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Sales analytics',
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
  searchParams: Promise<{
    period?: string;
    anchor?: string;
    monthYear?: string;
    monthNumber?: string;
  }>;
}

function isPeriod(value: string | undefined): value is Period {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year';
}

function todayKey(): string {
  return dateInputKeyIst();
}

function defaultAnchor(period: Period): string {
  const today = todayKey();
  if (period === 'day') return today;
  if (period === 'month') return today.slice(0, 7);
  if (period === 'year') return today.slice(0, 4);
  return today;
}

function normalizeAnchor(
  period: Period,
  anchor: string | undefined,
  monthYear: string | undefined,
  monthNumber: string | undefined,
): string {
  if (period === 'month') {
    const year = monthYear?.match(/^\d{4}$/) ? monthYear : undefined;
    const month = Number(monthNumber);
    if (year && Number.isInteger(month) && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
  }
  return anchor ?? defaultAnchor(period);
}

function inputType(period: Period): 'date' | 'month' | 'number' {
  if (period === 'month') return 'month';
  if (period === 'year') return 'number';
  return 'date';
}

function cityDetailHref(city: string, period: Period, anchor: string): string {
  const params = new URLSearchParams({ city, period, anchor });
  return `/admin/analytics/gross/location?${params.toString()}`;
}

export default async function GrossSalesByCityPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const {
    period: rawPeriod,
    anchor: rawAnchor,
    monthYear: rawMonthYear,
    monthNumber: rawMonthNumber,
  } = await searchParams;
  const period = isPeriod(rawPeriod) ? rawPeriod : 'month';
  const anchor = normalizeAnchor(period, rawAnchor, rawMonthYear, rawMonthNumber);
  const [selectedMonthYear, selectedMonthNumber = ''] =
    period === 'month' ? anchor.split('-') : ['', ''];

  let analytics: Awaited<ReturnType<typeof getSalesAnalytics>> | null = null;
  let loadError: string | null = null;
  try {
    analytics = await getSalesAnalytics(
      session.accessToken,
      { period, anchor },
      { next: { revalidate: 0 } },
    );
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = err.problem.detail ?? err.message;
    } else {
      throw err;
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Analytics
      </Link>

      <div>
        <h1 className="font-display break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          Sales analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gross sales, product-wise sales, and city-wise sales for the selected period.
        </p>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="space-y-4 p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="bg-secondary/50 flex w-full max-w-full overflow-x-auto rounded-md p-1 sm:w-auto">
              {PERIODS.map((p) => (
                <a
                  key={p.key}
                  href={`/admin/analytics/gross?period=${p.key}&anchor=${defaultAnchor(p.key)}`}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </a>
              ))}
            </div>
            <form
              method="get"
              className="grid w-full max-w-full gap-2 sm:flex sm:flex-wrap sm:items-end"
            >
              <input type="hidden" name="period" value={period} />
              {period === 'month' ? (
                <>
                  <label className="text-muted-foreground grid gap-1 text-xs font-medium">
                    Year
                    <input
                      type="number"
                      name="monthYear"
                      defaultValue={selectedMonthYear}
                      min="2000"
                      max="2100"
                      inputMode="numeric"
                      className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-28"
                    />
                  </label>
                  <label className="text-muted-foreground grid gap-1 text-xs font-medium">
                    Month
                    <select
                      name="monthNumber"
                      defaultValue={String(Number(selectedMonthNumber))}
                      className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-40"
                    >
                      {[
                        'January',
                        'February',
                        'March',
                        'April',
                        'May',
                        'June',
                        'July',
                        'August',
                        'September',
                        'October',
                        'November',
                        'December',
                      ].map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
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
              )}
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

      {loadError ? (
        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-lg border px-4 py-3 text-sm">
          {loadError}
        </p>
      ) : null}

      <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Gross sale {analytics ? `· ${analytics.label}` : ''}
            </p>
            <p className="font-display mt-1 text-2xl font-semibold">
              {formatINR(analytics?.totalGrossPaise ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Orders</p>
            <p className="font-display mt-1 text-2xl font-semibold">
              {analytics?.totalOrders ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid w-full min-w-0 gap-6 xl:grid-cols-2">
        <SalesTable
          title="Product-wise sales"
          empty="No product sales in this period."
          headers={['Product', 'Qty', 'Free', 'Discount', 'Gross', 'Share']}
          rows={(analytics?.productRows ?? []).map((row) => [
            row.productName,
            row.chargedQuantity,
            row.freeQuantity,
            formatINR(row.discountPaise),
            formatINR(row.grossPaise),
            `${row.sharePercent}%`,
          ])}
        />
        <SalesTable
          title="City-wise sales"
          empty="No city sales in this period."
          headers={['City', 'Orders', 'Gross', 'Share']}
          rows={(analytics?.regionRows ?? []).map((row) => [
            <Link
              key={row.region}
              href={cityDetailHref(row.region, period, anchor)}
              className="text-primary break-words font-medium hover:underline"
            >
              {row.region}
            </Link>,
            row.orderCount,
            formatINR(row.grossPaise),
            `${row.sharePercent}%`,
          ])}
        />
      </div>
    </div>
  );
}

function SalesTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}): JSX.Element {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b p-5">
          <h2 className="font-display text-base font-semibold">{title}</h2>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-8 text-center text-sm">{empty}</p>
        ) : (
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  {headers.map((header, index) => (
                    <th key={header} className={`px-4 py-3 ${index === 0 ? '' : 'text-right'}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${index}-${cellIndex}`}
                        className={`px-4 py-3 ${cellIndex === 0 ? 'max-w-[260px] whitespace-normal break-words font-medium' : 'whitespace-nowrap text-right font-mono'}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
