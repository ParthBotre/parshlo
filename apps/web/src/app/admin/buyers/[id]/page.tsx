import { type OrderStatus } from '@parshlo/types';
import { type Metadata } from 'next';
import Link from 'next/link';

import { BuyerManagementPanel } from '@/components/admin/buyer-management-panel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminBuyer } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatDateIst, formatDateKeyDisplay } from '@/lib/format-datetime';
import { orderStatusLabel } from '@/lib/order-workflow';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Buyer Details',
  robots: { index: false, follow: false },
};

const PERIOD_ANALYTICS_LABELS = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
] as const;
type BuyerAnalyticsPeriod = (typeof PERIOD_ANALYTICS_LABELS)[number]['key'];

const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
  APPROVED: 'success',
  PENDING_VERIFICATION: 'warning',
  UNDER_REVIEW: 'secondary',
  REJECTED: 'warning',
  SUSPENDED: 'warning',
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string; anchor?: string }>;
}

function isBuyerAnalyticsPeriod(value: string | undefined): value is BuyerAnalyticsPeriod {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year';
}

function formatDate(value: string | null): string {
  return value ? formatDateIst(value) : '—';
}

function businessCalendarDate(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
}

function dateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function isoWeekStart(year: number, week: number): Date | null {
  if (week < 1 || week > 53) return null;

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const start = new Date(jan4);
  start.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  return weekKey(start) === `${year}-W${String(week).padStart(2, '0')}` ? start : null;
}

function weekKey(date: Date): string {
  const day = date.getUTCDay() || 7;
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - day);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function parseWeekKey(value: string): Date | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;

  return isoWeekStart(Number(match[1]), Number(match[2]));
}

function normalizePeriodAnchor(period: BuyerAnalyticsPeriod, anchor: string | undefined): string {
  const today = businessCalendarDate();

  if (period === 'day') {
    return anchor && parseDateKey(anchor) ? anchor : dateKey(today);
  }

  if (period === 'week') {
    if (anchor && parseWeekKey(anchor)) return anchor;
    const dateAnchor = anchor ? parseDateKey(anchor) : null;
    return weekKey(dateAnchor ?? today);
  }

  if (period === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(anchor ?? '');
    const month = match ? Number(match[2]) : 0;
    return match && month >= 1 && month <= 12 ? match[0] : dateKey(today).slice(0, 7);
  }

  return anchor && /^\d{4}$/.test(anchor) ? anchor : String(today.getUTCFullYear());
}

function periodContextLabel(period: BuyerAnalyticsPeriod, anchor: string): string {
  const anchorDate = parseDateKey(anchor) ?? businessCalendarDate();

  if (period === 'day') {
    return formatDateKeyDisplay(dateKey(anchorDate));
  }

  if (period === 'week') {
    const start = parseWeekKey(anchor) ?? anchorDate;
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return `${formatDateKeyDisplay(dateKey(start))} - ${formatDateKeyDisplay(dateKey(end))}`;
  }

  if (period === 'month') {
    const [year, month] = anchor.split('-').map(Number);
    const paddedMonth = String(month).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${formatDateKeyDisplay(`${year}-${paddedMonth}-01`)} - ${formatDateKeyDisplay(`${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`)}`;
  }

  return `${formatDateKeyDisplay(`${anchor}-01-01`)} - ${formatDateKeyDisplay(`${anchor}-12-31`)}`;
}

function periodInputConfig(period: BuyerAnalyticsPeriod): {
  label: string;
  type: 'date' | 'month' | 'number';
  min?: string;
  max?: string;
  inputMode?: 'numeric';
} {
  if (period === 'day') {
    return { label: 'Date', type: 'date' };
  }

  if (period === 'week') {
    return { label: 'Week', type: 'date' };
  }

  if (period === 'month') {
    return { label: 'Month', type: 'month' };
  }

  return { label: 'Year', type: 'number', min: '2000', max: '2100', inputMode: 'numeric' };
}

function defaultAnchorForPeriod(period: BuyerAnalyticsPeriod): string {
  return normalizePeriodAnchor(period, undefined);
}

function weekCalendar(anchor: string): {
  monthLabel: string;
  previousAnchor: string;
  nextAnchor: string;
  weeks: {
    key: string;
    label: string;
    selected: boolean;
    days: { date: Date; inMonth: boolean }[];
  }[];
} {
  const selectedStart = parseWeekKey(anchor) ?? businessCalendarDate();
  const monthStart = new Date(
    Date.UTC(selectedStart.getUTCFullYear(), selectedStart.getUTCMonth(), 1),
  );
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const firstDay = monthStart.getUTCDay() || 7;
  const cursor = new Date(monthStart);
  cursor.setUTCDate(monthStart.getUTCDate() - firstDay + 1);

  const weeks = [];
  while (cursor <= monthEnd || weeks.length < 5) {
    const start = new Date(cursor);
    const key = weekKey(start);
    const weekNumber = key.split('-W')[1] ?? '';
    weeks.push({
      key,
      label: `W${weekNumber}`,
      selected: key === anchor,
      days: Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setUTCDate(start.getUTCDate() + index);
        return {
          date,
          inMonth: date.getUTCMonth() === monthStart.getUTCMonth(),
        };
      }),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return {
    monthLabel: `${formatDateKeyDisplay(dateKey(monthStart))} - ${formatDateKeyDisplay(dateKey(monthEnd))}`,
    previousAnchor: weekKey(
      new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1)),
    ),
    nextAnchor: weekKey(
      new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)),
    ),
    weeks,
  };
}

function statusBreakdownLabel(statusCounts: Record<string, number>): string {
  return (
    Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${orderStatusLabel(status as OrderStatus)} ${count}`)
      .join(' · ') || 'No orders'
  );
}

export default async function BuyerDetailPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const { id } = await params;
  const { period: rawPeriod, anchor: rawAnchor } = await searchParams;
  const selectedPeriod = isBuyerAnalyticsPeriod(rawPeriod) ? rawPeriod : 'month';
  const selectedAnchor = normalizePeriodAnchor(selectedPeriod, rawAnchor);
  let buyer: Awaited<ReturnType<typeof getAdminBuyer>> | null = null;
  let error: string | null = null;

  try {
    buyer = await getAdminBuyer(
      session.accessToken,
      id,
      { period: selectedPeriod, anchor: selectedAnchor },
      { next: { revalidate: 0 } },
    );
  } catch (err) {
    if (err instanceof ApiError) {
      error = err.problem.detail ?? 'Could not load buyer.';
    } else {
      throw err;
    }
  }

  if (!buyer) {
    return (
      <div className="space-y-4">
        <Link href="/admin/buyers" className="text-muted-foreground hover:text-foreground text-sm">
          ← All buyers
        </Link>
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
          {error ?? 'Buyer not found.'}
        </div>
      </div>
    );
  }

  const summary = buyer.orderSummary;
  const selectedPeriodLabel =
    PERIOD_ANALYTICS_LABELS.find((period) => period.key === selectedPeriod)?.label ?? 'Monthly';
  const selectedPeriodAnalytics = summary.periodAnalytics[selectedPeriod];
  const selectedPeriodContext = periodContextLabel(selectedPeriod, selectedAnchor);
  const inputConfig = periodInputConfig(selectedPeriod);
  const selectedWeekCalendar = selectedPeriod === 'week' ? weekCalendar(selectedAnchor) : null;
  const canManageBuyer = session.user.roles.some(
    (role) => role === 'ADMIN' || role === 'SUPER_ADMIN',
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/admin/buyers" className="text-muted-foreground hover:text-foreground text-sm">
          ← All buyers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {buyer.businessName ?? buyer.fullName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {buyer.fullName} · {buyer.email}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[buyer.accountStatus] ?? 'secondary'}>
            {buyer.accountStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {canManageBuyer ? <BuyerManagementPanel buyer={buyer} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Total Orders</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{summary.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Lifetime Spend</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{formatINR(summary.totalPaise)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">This Month</p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {formatINR(summary.currentMonthPaise)}
            </p>
            <p className="text-muted-foreground text-xs">{summary.currentMonthOrders} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Average Order</p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {formatINR(summary.averageOrderPaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Period Analytics</CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">
                  {selectedPeriodLabel} buyer performance · {selectedPeriodContext}
                </p>
              </div>
              <div className="bg-secondary/50 inline-flex rounded-md p-1">
                {PERIOD_ANALYTICS_LABELS.map((period) => (
                  <a
                    key={period.key}
                    href={`/admin/buyers/${buyer.id}?period=${period.key}&anchor=${defaultAnchorForPeriod(period.key)}`}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedPeriod === period.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period.label}
                  </a>
                ))}
              </div>
            </div>
            {selectedWeekCalendar ? (
              <div className="bg-background mt-4 w-full max-w-md rounded-md border p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <a
                    href={`/admin/buyers/${buyer.id}?period=week&anchor=${selectedWeekCalendar.previousAnchor}`}
                    className="text-muted-foreground hover:text-foreground rounded px-2 py-1 text-lg leading-none"
                    aria-label="Previous month"
                  >
                    ←
                  </a>
                  <p className="text-sm font-medium">{selectedWeekCalendar.monthLabel}</p>
                  <a
                    href={`/admin/buyers/${buyer.id}?period=week&anchor=${selectedWeekCalendar.nextAnchor}`}
                    className="text-muted-foreground hover:text-foreground rounded px-2 py-1 text-lg leading-none"
                    aria-label="Next month"
                  >
                    →
                  </a>
                </div>
                <table className="w-full table-fixed text-center text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="w-12 pb-2 font-medium">Week</th>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                        <th key={`${day}-${index}`} className="pb-2 font-medium">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWeekCalendar.weeks.map((week) => (
                      <tr
                        key={week.key}
                        className={
                          week.selected ? 'bg-primary/15 text-foreground' : 'text-foreground'
                        }
                      >
                        <td className="py-1">
                          <a
                            href={`/admin/buyers/${buyer.id}?period=week&anchor=${week.key}`}
                            className={`block rounded px-1 py-2 font-medium ${
                              week.selected
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-secondary'
                            }`}
                            aria-current={week.selected ? 'date' : undefined}
                          >
                            {week.label}
                          </a>
                        </td>
                        {week.days.map((day) => (
                          <td key={dateKey(day.date)} className="py-1">
                            <a
                              href={`/admin/buyers/${buyer.id}?period=week&anchor=${week.key}`}
                              className={`block rounded px-1 py-2 ${
                                week.selected ? 'bg-primary/10 font-semibold' : 'hover:bg-secondary'
                              } ${day.inMonth ? '' : 'text-muted-foreground/60'}`}
                              aria-current={week.selected ? 'date' : undefined}
                            >
                              {day.date.getUTCDate()}
                            </a>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <form
                key={`${selectedPeriod}-${selectedAnchor}`}
                method="get"
                className="mt-4 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="period" value={selectedPeriod} />
                <label className="text-muted-foreground grid gap-1 text-xs font-medium">
                  {inputConfig.label}
                  <input
                    key={`${selectedPeriod}-${selectedAnchor}-input`}
                    type={inputConfig.type}
                    name="anchor"
                    defaultValue={selectedAnchor}
                    min={inputConfig.min}
                    max={inputConfig.max}
                    inputMode={inputConfig.inputMode}
                    className="border-input bg-background text-foreground focus:border-primary h-9 w-44 rounded-md border px-3 text-sm shadow-sm outline-none transition-colors"
                  />
                </label>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-4 text-sm font-medium shadow-sm transition-colors"
                >
                  Apply
                </button>
              </form>
            )}
          </CardHeader>
          <CardContent>
            <div className="bg-secondary/30 mb-4 rounded-md px-3 py-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                Active {selectedPeriodLabel.toLowerCase()} window
              </p>
              <p className="text-sm font-medium">{selectedPeriodContext}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Orders</p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {selectedPeriodAnalytics.orderCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Spend</p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {formatINR(selectedPeriodAnalytics.totalPaise)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Average</p>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {formatINR(selectedPeriodAnalytics.averageOrderPaise)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buyer Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <p className="text-muted-foreground text-xs">GSTIN</p>
              <p className="font-mono">{buyer.gstin ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Mobile</p>
              <p>{buyer.mobile ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Business Type</p>
              <p>{buyer.businessType ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Drug License</p>
              <p>{buyer.drugLicenseNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Location</p>
              <p>{[buyer.city, buyer.state].filter(Boolean).join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Joined</p>
              <p>{formatDate(buyer.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Items</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Shipment</th>
                  </tr>
                </thead>
                <tbody>
                  {buyer.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted-foreground p-8 text-center text-sm">
                        No orders yet.
                      </td>
                    </tr>
                  ) : (
                    buyer.recentOrders.map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                          {formatDate(order.placedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant="secondary">
                            {orderStatusLabel(order.status as OrderStatus)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                          {order.itemCount}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                          {formatINR(order.totalPaise)}
                        </td>
                        <td className="text-muted-foreground whitespace-nowrap px-4 py-3 text-xs">
                          {order.courierDocketNumber
                            ? `${order.courierService ?? 'Courier'} · ${order.courierDocketNumber}`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {statusBreakdownLabel(summary.statusCounts)}
            </p>
            <div className="mt-4">
              <p className="text-muted-foreground text-xs">Latest order</p>
              <p className="font-mono text-sm font-medium">{summary.latestOrderNumber ?? '—'}</p>
              <p className="text-muted-foreground text-xs">
                {summary.latestOrderStatus
                  ? orderStatusLabel(summary.latestOrderStatus as OrderStatus)
                  : 'No orders'}{' '}
                · {formatDate(summary.latestOrderAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
