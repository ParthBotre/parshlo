import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { listMyOrders } from '@/lib/api/orders';
import { getSession } from '@/lib/auth/session';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, 'secondary' | 'success' | 'warning' | 'outline' | 'default'> = {
  RECEIVED: 'secondary',
  UNDER_REVIEW: 'secondary',
  APPROVED: 'default',
  PREPARING: 'default',
  DISPATCHED: 'default',
  OUT_FOR_DELIVERY: 'default',
  DELIVERED: 'success',
  CANCELLED: 'warning',
  REJECTED: 'warning',
};

export default async function OrdersPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/orders');
  }

  let orders: Awaited<ReturnType<typeof listMyOrders>> = [];
  try {
    orders = await listMyOrders(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Orders</h1>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No orders yet. Start in the{' '}
              <Link href="/dashboard/catalog" className="text-primary hover:underline">
                catalog
              </Link>
              .
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Placed</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-accent/40">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="font-medium hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS_VARIANT[o.status] ?? 'secondary'}>
                        {o.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{o.items.length}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(o.placedAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{formatINR(o.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
