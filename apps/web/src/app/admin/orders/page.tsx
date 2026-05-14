import { type Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { listAllOrders } from '@/lib/api/admin';
import { getSession } from '@/lib/auth/session';
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
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Delivered', value: 'DELIVERED' },
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
            <p className="p-10 text-center text-sm text-muted-foreground">No orders match.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Placed</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-accent/40">
                    <td className="px-5 py-3 font-medium">{o.orderNumber}</td>
                    <td className="px-5 py-3">{o.buyerBusinessName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {o.buyerGstin}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary">{o.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(o.placedAt).toLocaleDateString('en-IN')}
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
