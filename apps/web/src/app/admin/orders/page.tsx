import { type OrderStatus } from '@parshlo/types';
import { type Metadata } from 'next';
import Link from 'next/link';
import { type z } from 'zod';

import { CourierTrackingCell } from '@/components/admin/courier-tracking-cell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { listAllOrders } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatDateKeyDisplay } from '@/lib/format-datetime';
import { orderStatusLabel } from '@/lib/order-workflow';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Orders',
  robots: { index: false, follow: false },
};

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Rejected', value: 'REJECTED' },
] as const;

type OrderStatusType = z.infer<typeof OrderStatus>;

interface PageProps {
  searchParams: Promise<{ status?: string; month?: string; year?: string }>;
}

type AdminOrder = Awaited<ReturnType<typeof listAllOrders>>[number];

const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

const MONTH_OPTIONS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

function calendarParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function calendarDateKey(date: Date): string {
  const parts = calendarParts(date);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function currentBusinessMonth(): { month: string; year: string } {
  const parts = calendarParts(new Date());
  return { month: pad2(parts.month), year: String(parts.year) };
}

function isMonth(value: string | undefined): value is string {
  return MONTH_OPTIONS.some(([month]) => month === value);
}

function isYear(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}

function monthLabel(month: string): string {
  return MONTH_OPTIONS.find(([value]) => value === month)?.[1] ?? month;
}

function ordersHref(status: string | undefined, month: string, year: string): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('month', month);
  params.set('year', year);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : '/admin/orders';
}

function rateTierLabel(tier: AdminOrder['rateTierSummary']): string {
  if (tier === 'RATE_A') return 'Rate A';
  if (tier === 'RATE_B') return 'Rate B';
  return 'Mixed';
}

export default async function AdminOrdersPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { status, month: rawMonth, year: rawYear } = await searchParams;
  const current = currentBusinessMonth();
  const selectedMonth = isMonth(rawMonth) ? rawMonth : current.month;
  const selectedYear = isYear(rawYear) ? rawYear : current.year;
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  let orders: Awaited<ReturnType<typeof listAllOrders>> = [];
  try {
    orders = await listAllOrders(session.accessToken, { status }, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }
  const yearOptions = Array.from(
    new Set([
      current.year,
      selectedYear,
      ...orders.map((order) => String(calendarParts(new Date(order.placedAt)).year)),
    ]),
  ).sort((a, b) => b.localeCompare(a));
  const selectedOrders = orders.filter((order) => {
    const parts = calendarParts(new Date(order.placedAt));
    return String(parts.year) === selectedYear && pad2(parts.month) === selectedMonth;
  });
  const selectedTotalPaise = selectedOrders.reduce((total, order) => total + order.totalPaise, 0);
  const selectedPeriodLabel = `${monthLabel(selectedMonth)} ${selectedYear}`;

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Operations view across every buyer. Click an order to drill in.
        </p>
      </div>

      <div className="flex max-w-full flex-wrap gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.value || (status === undefined && f.value === undefined);
          return (
            <Link
              key={f.label}
              href={ordersHref(f.value, selectedMonth, selectedYear)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-muted-foreground p-10 text-center text-sm">No orders match.</p>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="font-display text-base font-semibold tracking-tight">
                    Order Ledger
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {selectedOrders.length} orders in {selectedPeriodLabel}
                  </p>
                </div>
                <form className="flex flex-wrap items-end gap-2" action="/admin/orders">
                  {status ? <input type="hidden" name="status" value={status} /> : null}
                  <label className="grid gap-1 text-xs font-medium">
                    Month
                    <select
                      name="month"
                      defaultValue={selectedMonth}
                      className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                    >
                      {MONTH_OPTIONS.map(([month, label]) => (
                        <option key={month} value={month}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Year
                    <select
                      name="year"
                      defaultValue={selectedYear}
                      className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="border-input bg-background hover:bg-accent h-9 rounded-md border px-3 text-sm font-semibold"
                  >
                    Apply
                  </button>
                </form>
              </div>

              <div className="min-w-0 divide-y">
                <div>
                  <div className="bg-secondary/20 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold">{selectedPeriodLabel}</h3>
                      <p className="text-muted-foreground text-xs">
                        {selectedOrders.length} orders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-[11px] uppercase tracking-wider">
                        Month total
                      </p>
                      <p className="font-mono text-sm font-semibold">
                        {formatINR(selectedTotalPaise)}
                      </p>
                    </div>
                  </div>
                  {selectedOrders.length === 0 ? (
                    <p className="text-muted-foreground p-8 text-center text-sm">
                      No orders for {selectedPeriodLabel}.
                    </p>
                  ) : (
                    <div className="w-full max-w-full overflow-x-auto">
                      <table className="w-full min-w-[1040px] text-sm">
                        <thead className="text-muted-foreground text-left text-xs uppercase tracking-wider">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3">Order #</th>
                            <th className="whitespace-nowrap px-4 py-3">Buyer</th>
                            <th className="whitespace-nowrap px-4 py-3">GSTIN</th>
                            <th className="whitespace-nowrap px-4 py-3">Status</th>
                            <th className="whitespace-nowrap px-4 py-3">Rate</th>
                            <th className="whitespace-nowrap px-4 py-3">Placed</th>
                            <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                            <th className="whitespace-nowrap px-4 py-3">Shipment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrders.map((o) => (
                            <tr key={o.id} className="hover:bg-accent/40 border-t">
                              <td className="whitespace-nowrap px-4 py-3">
                                <Link
                                  href={`/admin/orders/${o.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {o.orderNumber}
                                </Link>
                              </td>
                              <td className="max-w-[260px] px-4 py-3">
                                <p className="break-words font-medium">{o.buyerBusinessName}</p>
                              </td>
                              <td className="text-muted-foreground whitespace-nowrap px-4 py-3 font-mono text-xs">
                                {o.buyerGstin}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge variant="secondary">
                                  {orderStatusLabel(o.status as OrderStatusType)}
                                </Badge>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold">
                                {rateTierLabel(o.rateTierSummary)}
                              </td>
                              <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                                {formatDateKeyDisplay(calendarDateKey(new Date(o.placedAt)))}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                                {formatINR(o.totalPaise)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <CourierTrackingCell
                                  courierService={o.courierService ?? null}
                                  courierPartnerName={o.courierPartnerName ?? null}
                                  courierPartnerWebsiteUrl={o.courierPartnerWebsiteUrl ?? null}
                                  courierDocketNumber={o.courierDocketNumber ?? null}
                                  courierTrackingUpdatedAt={o.courierTrackingUpdatedAt ?? null}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
