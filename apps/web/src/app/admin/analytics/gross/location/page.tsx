import { ArrowLeft } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, CardContent } from '@/components/ui/card';
import { loadMonthOrdersForAnalytics } from '@/lib/admin-gross-analytics';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { aggregateSalesByBuyerInLocation } from '@/lib/sales-by-city';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Sales by buyer',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ city?: string; state?: string }>;
}

function formatMonthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function GrossSalesLocationDetailPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const { city: cityParam, state: stateParam } = await searchParams;
  if (!cityParam?.trim() || !stateParam?.trim()) {
    notFound();
  }

  const city = cityParam.trim();
  const state = stateParam.trim();

  let orders: Awaited<ReturnType<typeof loadMonthOrdersForAnalytics>>['orders'] = [];
  let monthStart = '';
  try {
    const loaded = await loadMonthOrdersForAnalytics(session.accessToken);
    orders = loaded.orders;
    monthStart = loaded.monthStart;
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  const report = aggregateSalesByBuyerInLocation(orders, city, state, monthStart);

  if (report.totalOrders === 0) {
    notFound();
  }

  const monthLabel = formatMonthLabel(report.monthStart);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/analytics/gross"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Sales by location
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {report.city}, {report.state}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Buyer breakdown for {monthLabel} — share of this city&apos;s gross.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">City gross</p>
            <p className="font-display mt-1 text-2xl font-semibold">
              {formatINR(report.totalGrossPaise)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Orders</p>
            <p className="font-display mt-1 text-2xl font-semibold">{report.totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">GSTIN</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Gross</th>
                  <th className="px-5 py-3">Share in city</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.gstin !== '—' ? row.gstin : row.businessName} className="border-t">
                    <td className="max-w-[260px] whitespace-normal break-words px-5 py-3">
                      <p className="font-medium">{row.businessName}</p>
                      {row.contactName !== row.businessName ? (
                        <p className="text-muted-foreground text-xs">{row.contactName}</p>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3 font-mono text-xs">
                      {row.gstin}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                      {row.orderCount}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-mono">
                      {formatINR(row.grossPaise)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex min-w-[140px] items-center gap-2">
                        <div className="bg-secondary h-2 flex-1 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${Math.min(row.sharePercent, 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-10 shrink-0 text-right font-mono text-xs">
                          {row.sharePercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
