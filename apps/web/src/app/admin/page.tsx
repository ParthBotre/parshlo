import { BadgeCheck, BarChart3, IndianRupee, MapPin, ScrollText, Users } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { getAnalyticsSummary, getSalesByCity, listPendingKyc } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatDateIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  let summary: Awaited<ReturnType<typeof getAnalyticsSummary>> | null = null;
  let pending: Awaited<ReturnType<typeof listPendingKyc>> = [];
  let citySales: Awaited<ReturnType<typeof getSalesByCity>> | null = null;

  try {
    [summary, pending, citySales] = await Promise.all([
      getAnalyticsSummary(session.accessToken, { next: { revalidate: 30 } }),
      listPendingKyc(session.accessToken, { next: { revalidate: 30 } }),
      getSalesByCity(session.accessToken, { next: { revalidate: 30 } }),
    ]);
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          High-level overview of platform health and inbound work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={BadgeCheck}
          label="Pending KYC"
          value={summary?.pendingKyc ?? 0}
          href="/admin/kyc"
          accent="warning"
        />
        <Stat
          icon={Users}
          label="Approved buyers"
          value={summary?.approvedBuyers ?? 0}
          href="/admin/buyers"
        />
        <Stat
          icon={ScrollText}
          label="Orders this month"
          value={summary?.ordersThisMonth ?? 0}
          href="/admin/orders"
        />
        <Stat
          icon={IndianRupee}
          label="Gross this month"
          value={formatINR(summary?.grossThisMonthPaise ?? 0)}
          href="/admin/analytics/gross"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold">City-wise sales</h2>
                <p className="text-muted-foreground text-xs">
                  {formatINR(citySales?.totalGrossPaise ?? 0)} across {citySales?.totalOrders ?? 0}{' '}
                  orders this month
                </p>
              </div>
            </div>
            <Link href="/admin/analytics/gross" className="text-primary text-sm hover:underline">
              Open full analytics →
            </Link>
          </div>
          {(citySales?.rows ?? []).length === 0 ? (
            <p className="text-muted-foreground border-t p-8 text-center text-sm">
              No city sales recorded this month.
            </p>
          ) : (
            <div className="overflow-x-auto border-t">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">City</th>
                    <th className="px-5 py-3 text-right">Orders</th>
                    <th className="px-5 py-3 text-right">Gross</th>
                    <th className="px-5 py-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(citySales?.rows ?? []).map((row) => (
                    <tr key={`${row.city}-${row.state}`} className="border-t">
                      <td className="px-5 py-3 font-medium">
                        {row.city}
                        <span className="text-muted-foreground font-normal"> · {row.state}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{row.orderCount}</td>
                      <td className="px-5 py-3 text-right font-mono">
                        {formatINR(row.grossPaise)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{row.sharePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold">Secondary sales</h2>
              <p className="text-muted-foreground text-xs">
                Compare stockist primary stock against secondary sale and closing stock.
              </p>
            </div>
          </div>
          <Link
            href="/admin/analytics/secondary-sales"
            className="text-primary text-sm hover:underline"
          >
            Open secondary sales →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5">
            <h2 className="font-display text-base font-semibold">Pending verification</h2>
            <Link href="/admin/kyc" className="text-primary text-sm hover:underline">
              Open queue →
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-muted-foreground border-t p-8 text-center text-sm">
              Nothing in the queue. Nicely done.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Business</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 6).map((k) => (
                  <tr key={k.id} className="border-t">
                    <td className="px-5 py-3 font-medium">{k.businessName}</td>
                    <td className="text-muted-foreground px-5 py-3">
                      {k.status.replace(/_/g, ' ')}
                    </td>
                    <td className="text-muted-foreground px-5 py-3">
                      {formatDateIst(k.submittedAt)}
                    </td>
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

function Stat({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: number | string;
  href: string;
  accent?: 'warning';
}): JSX.Element {
  return (
    <Link href={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              accent === 'warning' ? 'bg-amber-500/15 text-amber-300' : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
            <p className="font-display truncate text-xl font-semibold">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
