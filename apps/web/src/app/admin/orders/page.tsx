import { type OrderStatus } from '@parshlo/types';
import { type Metadata } from 'next';
import Link from 'next/link';

import { CourierTrackingCell } from '@/components/admin/courier-tracking-cell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { listAllOrders } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
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

interface PageProps {
  searchParams: Promise<{ status?: string; period?: string }>;
}

type OrderPeriod = 'day' | 'week' | 'month' | 'year';
type AdminOrder = Awaited<ReturnType<typeof listAllOrders>>[number];

const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

const PERIOD_FILTERS: { label: string; value: OrderPeriod }[] = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
  { label: 'Yearly', value: 'year' },
];

function isOrderPeriod(value: string | undefined): value is OrderPeriod {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year';
}

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

function formatCalendarDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-IN', { ...options, timeZone: BUSINESS_TIME_ZONE });
}

function formatUtcCalendarDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-IN', { ...options, timeZone: 'UTC' });
}

function businessCalendarDate(date: Date): Date {
  const parts = calendarParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function startOfWeek(date: Date): Date {
  const start = businessCalendarDate(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

function periodKey(date: Date, period: OrderPeriod): string {
  if (period === 'day') return calendarDateKey(date);
  if (period === 'week') return startOfWeek(date).toISOString().slice(0, 10);
  if (period === 'month') {
    const parts = calendarParts(date);
    return `${parts.year}-${pad2(parts.month)}`;
  }
  return String(calendarParts(date).year);
}

function periodLabel(date: Date, period: OrderPeriod): string {
  if (period === 'day') {
    return formatCalendarDate(date, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  if (period === 'week') {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return `${formatUtcCalendarDate(start, { day: '2-digit', month: 'short' })} - ${formatUtcCalendarDate(end, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (period === 'month') {
    return formatCalendarDate(date, { month: 'long', year: 'numeric' });
  }
  return formatCalendarDate(date, { year: 'numeric' });
}

function groupOrders(orders: AdminOrder[], period: OrderPeriod) {
  const groups = new Map<string, { label: string; rows: AdminOrder[]; totalPaise: number }>();

  for (const order of orders) {
    const placedAt = new Date(order.placedAt);
    const key = periodKey(placedAt, period);
    const group = groups.get(key) ?? {
      label: periodLabel(placedAt, period),
      rows: [],
      totalPaise: 0,
    };
    group.rows.push(order);
    group.totalPaise += order.totalPaise;
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, group]) => ({ key, ...group }));
}

function ordersHref(status: string | undefined, period: OrderPeriod): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (period !== 'month') params.set('period', period);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : '/admin/orders';
}

export default async function AdminOrdersPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { status, period: rawPeriod } = await searchParams;
  const period = isOrderPeriod(rawPeriod) ? rawPeriod : 'month';
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
  const orderGroups = groupOrders(orders, period);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Operations view across every buyer. Click an order to drill in.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.value || (status === undefined && f.value === undefined);
          return (
            <Link
              key={f.label}
              href={ordersHref(f.value, period)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
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
                    {orders.length} orders grouped{' '}
                    {PERIOD_FILTERS.find((f) => f.value === period)?.label.toLowerCase()}
                  </p>
                </div>
                <div className="bg-secondary/50 inline-flex rounded-md p-1">
                  {PERIOD_FILTERS.map((f) => (
                    <Link
                      key={f.value}
                      href={ordersHref(status, f.value)}
                      className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                        period === f.value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="min-w-0 divide-y">
                {orderGroups.map((group) => (
                  <div key={group.key}>
                    <div className="bg-secondary/20 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-semibold">{group.label}</h3>
                        <p className="text-muted-foreground text-xs">{group.rows.length} orders</p>
                      </div>
                      <p className="font-mono text-sm font-semibold">
                        {formatINR(group.totalPaise)}
                      </p>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead className="text-muted-foreground text-left text-xs uppercase tracking-wider">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3">Order #</th>
                            <th className="whitespace-nowrap px-4 py-3">Buyer</th>
                            <th className="whitespace-nowrap px-4 py-3">GSTIN</th>
                            <th className="whitespace-nowrap px-4 py-3">Status</th>
                            <th className="whitespace-nowrap px-4 py-3">Placed</th>
                            <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
                            <th className="whitespace-nowrap px-4 py-3">Shipment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((o) => (
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
                                  {orderStatusLabel(o.status as OrderStatus)}
                                </Badge>
                              </td>
                              <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                                {formatCalendarDate(new Date(o.placedAt), {
                                  day: 'numeric',
                                  month: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                                {formatINR(o.totalPaise)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <CourierTrackingCell
                                  courierService={o.courierService ?? null}
                                  courierDocketNumber={o.courierDocketNumber ?? null}
                                  courierTrackingUpdatedAt={o.courierTrackingUpdatedAt ?? null}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
