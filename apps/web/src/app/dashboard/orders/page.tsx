import { type Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { listMyOrders } from '@/lib/api/orders';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
};

const STATUS_VARIANT: Record<string, 'secondary' | 'success' | 'warning' | 'outline' | 'default'> =
  {
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
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No orders yet. Start in the{' '}
              <Link href="/dashboard/catalog" className="text-primary hover:underline">
                products
              </Link>
              .
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Order #</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Status</th>
                    <th className="hidden whitespace-nowrap px-4 py-3 sm:table-cell sm:px-5">
                      Items
                    </th>
                    <th className="hidden whitespace-nowrap px-4 py-3 sm:table-cell sm:px-5">
                      Placed
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right sm:px-5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/40 border-t">
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        <Link
                          href={`/dashboard/orders/${o.id}`}
                          className="font-medium hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        <Badge variant={STATUS_VARIANT[o.status] ?? 'secondary'}>
                          {o.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground hidden whitespace-nowrap px-4 py-3 sm:table-cell sm:px-5">
                        {o.items.length}
                      </td>
                      <td className="text-muted-foreground hidden whitespace-nowrap px-4 py-3 sm:table-cell sm:px-5">
                        {new Date(o.placedAt).toLocaleString('en-IN')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono sm:px-5">
                        {formatINR(o.totalPaise)}
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
