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
  { label: 'Out for delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps): Promise<JSX.Element> {
  const { status } = await searchParams;
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
              href={f.value ? `/admin/orders?status=${f.value}` : '/admin/orders'}
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

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="text-muted-foreground p-10 text-center text-sm">No orders match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
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
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/40 border-t">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-medium hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{o.buyerBusinessName}</td>
                      <td className="text-muted-foreground whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {o.buyerGstin}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant="secondary">
                          {orderStatusLabel(o.status as OrderStatus)}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                        {new Date(o.placedAt).toLocaleDateString('en-IN')}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
