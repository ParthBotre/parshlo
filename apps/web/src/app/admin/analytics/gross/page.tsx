import { ArrowLeft } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { loadGrossSalesByCityReport } from '@/lib/admin-gross-analytics';
import { getAnalyticsSummary } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { locationDetailHref, type SalesByCityReport, utcMonthStartIso } from '@/lib/sales-by-city';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Admin · Sales by location',
  robots: { index: false, follow: false },
};

function formatMonthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function GrossSalesByCityPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const monthStart = utcMonthStartIso();

  let summary: Awaited<ReturnType<typeof getAnalyticsSummary>> | null = null;
  let loadError: string | null = null;
  let breakdown: SalesByCityReport | undefined;

  try {
    summary = await getAnalyticsSummary(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = err.problem.detail ?? err.message;
    } else {
      throw err;
    }
  }

  try {
    const loaded = await loadGrossSalesByCityReport(session.accessToken);
    breakdown = loaded.breakdown;
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  const monthLabel = breakdown
    ? formatMonthLabel(breakdown.monthStart)
    : formatMonthLabel(monthStart);

  const totalGross = summary?.grossThisMonthPaise ?? breakdown?.totalGrossPaise ?? 0;
  const totalOrders = summary?.ordersThisMonth ?? breakdown?.totalOrders ?? 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Analytics
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Gross sales by location
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Distribution of {monthLabel} revenue by buyer business city. Click a city for buyer
          breakdown.
        </p>
      </div>

      {loadError ? (
        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-lg border px-4 py-3 text-sm">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Total gross</p>
            <p className="font-display mt-1 text-2xl font-semibold">{formatINR(totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">Orders</p>
            <p className="font-display mt-1 text-2xl font-semibold">{totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {!breakdown || breakdown.rows.length === 0 ? (
            <p className="text-muted-foreground p-10 text-center text-sm">
              {totalOrders > 0
                ? 'Could not load order location data. Try refreshing in a moment.'
                : `No orders placed in ${monthLabel.toLowerCase()} yet.`}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">State</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Gross</th>
                  <th className="px-5 py-3">Share</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.rows.map((row) => (
                  <tr key={`${row.city}-${row.state}`} className="hover:bg-accent/40 border-t">
                    <td className="px-5 py-3">
                      <Link
                        href={locationDetailHref(row.city, row.state)}
                        className="font-medium hover:underline"
                      >
                        {row.city}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-5 py-3">
                      <Link
                        href={locationDetailHref(row.city, row.state)}
                        className="hover:text-foreground hover:underline"
                      >
                        {row.state}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{row.orderCount}</td>
                    <td className="px-5 py-3 text-right font-mono">{formatINR(row.grossPaise)}</td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
