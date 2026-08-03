import { type Metadata } from 'next';

import { AdminBuyerCreateForm } from '@/components/admin/admin-buyer-create-form';
import { BuyerDirectory } from '@/components/admin/buyer-directory';
import { Card, CardContent } from '@/components/ui/card';
import { listAllBuyers } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Buyers',
  robots: { index: false, follow: false },
};

export default async function BuyersPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }
  let buyers: Awaited<ReturnType<typeof listAllBuyers>> = [];
  try {
    buyers = await listAllBuyers(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }
  const canCreateBuyer = session.user.roles.some(
    (role) => role === 'ADMIN' || role === 'SUPER_ADMIN',
  );
  const totalOrders = buyers.reduce((sum, buyer) => sum + buyer.orderSummary.totalOrders, 0);
  // const totalRevenuePaise = buyers.reduce((sum, buyer) => sum + buyer.orderSummary.totalPaise, 0);
  const monthOrders = buyers.reduce((sum, buyer) => sum + buyer.orderSummary.currentMonthOrders, 0);
  const monthRevenuePaise = buyers.reduce(
    (sum, buyer) => sum + buyer.orderSummary.currentMonthPaise,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Buyers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Register verified buyer accounts and manage approved B2B customers.
        </p>
      </div>
      {canCreateBuyer && (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none">
            <span className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium">
              Add Buyer
            </span>
          </summary>
          <div className="mt-4">
            <AdminBuyerCreateForm />
          </div>
        </details>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Buyers</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{buyers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Lifetime Orders</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          {/* <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Lifetime Revenue
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{formatINR(totalRevenuePaise)}</p>
          </CardContent> */}
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">This Month</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{formatINR(monthRevenuePaise)}</p>
            <p className="text-muted-foreground text-xs">{monthOrders} orders</p>
          </CardContent>
        </Card>
      </div>
      <BuyerDirectory buyers={buyers} />
    </div>
  );
}
