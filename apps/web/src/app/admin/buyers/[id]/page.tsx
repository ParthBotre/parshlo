import { type OrderStatus } from '@parshlo/types';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminBuyer } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
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

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
  APPROVED: 'success',
  PENDING_VERIFICATION: 'warning',
  UNDER_REVIEW: 'secondary',
  REJECTED: 'warning',
  SUSPENDED: 'warning',
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}

function isBuyerAnalyticsPeriod(value: string | undefined): value is BuyerAnalyticsPeriod {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year';
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('en-IN') : '—';
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
  const { period: rawPeriod } = await searchParams;
  const selectedPeriod = isBuyerAnalyticsPeriod(rawPeriod) ? rawPeriod : 'month';
  let buyer: Awaited<ReturnType<typeof getAdminBuyer>> | null = null;
  let error: string | null = null;

  try {
    buyer = await getAdminBuyer(session.accessToken, id, { next: { revalidate: 0 } });
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
                  {selectedPeriodLabel} buyer performance
                </p>
              </div>
              <div className="bg-secondary/50 inline-flex rounded-md p-1">
                {PERIOD_ANALYTICS_LABELS.map((period) => (
                  <Link
                    key={period.key}
                    href={`/admin/buyers/${buyer.id}?period=${period.key}`}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedPeriod === period.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period.label}
                  </Link>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
        <Card>
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
