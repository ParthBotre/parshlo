import { ArrowRight, BadgeCheck, PackageSearch, ScrollText, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listMyOrders } from '@/lib/api/orders';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardOverview(): Promise<JSX.Element> {
  const session = await getSession();
  let orders: Awaited<ReturnType<typeof listMyOrders>> = [];
  try {
    if (session) {
      orders = await listMyOrders(session.accessToken);
    }
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  const last30Days = orders.filter(
    (o) => Date.now() - new Date(o.placedAt).getTime() < 30 * 24 * 60 * 60 * 1000,
  );
  const inFlight = orders.filter((o) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Welcome back, {session?.user.fullName.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Verified B2B partner ·{' '}
            <Badge variant="success" className="ml-1 gap-1">
              <BadgeCheck className="h-3 w-3" />
              Active
            </Badge>
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/catalog">
            Browse products <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Orders, last 30 days"
          value={String(last30Days.length)}
          icon={ScrollText}
        />
        <StatCard label="In-flight orders" value={String(inFlight.length)} icon={PackageSearch} />
        <StatCard
          label="Lifetime spend"
          value={formatINR(orders.reduce((s, o) => s + o.totalPaise, 0))}
          icon={ShieldCheck}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5">
            <h2 className="font-display text-base font-semibold">Recent orders</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/orders">View all</Link>
            </Button>
          </div>
          {orders.length === 0 ? (
            <div className="text-muted-foreground border-t p-10 text-center text-sm">
              No orders yet — head to the{' '}
              <Link href="/dashboard/catalog" className="text-primary hover:underline">
                products
              </Link>{' '}
              to place your first one.
            </div>
          ) : (
            <table className="w-full border-t text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Placed</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-accent/40 border-t">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="font-medium hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary">{o.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="text-muted-foreground px-5 py-3">
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof PackageSearch;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
          <p className="font-display text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
