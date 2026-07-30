import { ArrowLeft, BarChart3 } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';

import SecondarySalesClient from './secondary-sales-client';

import { Card, CardContent } from '@/components/ui/card';
import { getSecondarySalesDashboard } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { dateInputKeyIst } from '@/lib/format-datetime';

export const metadata: Metadata = {
  title: 'Admin · Secondary sales',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    month?: string;
    stockistId?: string;
  }>;
}

function defaultMonth(): string {
  return dateInputKeyIst().slice(0, 7);
}

function normalizeMonth(value: string | undefined): string {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : defaultMonth();
}

function monthOptions(): { value: string; label: string }[] {
  const [yearRaw, monthRaw] = defaultMonth().split('-');
  const startYear = Number(yearRaw);
  const startMonth = Number(monthRaw);
  const formatter = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

  return Array.from({ length: 36 }, (_, index) => {
    const date = new Date(Date.UTC(startYear, startMonth - 1 - index, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatter.format(date) };
  });
}

export default async function SecondarySalesPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const { month: rawMonth, stockistId } = await searchParams;
  const month = normalizeMonth(rawMonth);
  const months = monthOptions();

  let dashboard: Awaited<ReturnType<typeof getSecondarySalesDashboard>> | null = null;
  let loadError: string | null = null;
  try {
    dashboard = await getSecondarySalesDashboard(
      session.accessToken,
      { periodMonth: month, stockistId },
      { next: { revalidate: 0 } },
    );
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = err.problem.detail ?? err.message;
    } else {
      throw err;
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      <Link
        href="/admin/analytics/gross"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Sales analytics
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display break-words text-2xl font-semibold tracking-tight sm:text-3xl">
            Secondary sales
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Track stockist primary stock received from Parshlo against secondary sale and closing
            stock.
          </p>
        </div>
        <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-lg">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-5">
          <form method="get" className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
            <label className="text-muted-foreground grid gap-1 text-xs font-medium">
              Month
              <select
                name="month"
                defaultValue={dashboard?.periodMonth ?? month}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-52"
              >
                {months.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground grid gap-1 text-xs font-medium">
              Stockist
              <select
                name="stockistId"
                defaultValue={dashboard?.selectedStockistId ?? ''}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-72"
              >
                {(dashboard?.stockists ?? []).map((stockist) => (
                  <option key={stockist.id} value={stockist.id}>
                    {stockist.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-4 text-sm font-medium"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {loadError ? (
        <p className="text-destructive border-destructive/30 bg-destructive/10 rounded-lg border px-4 py-3 text-sm">
          {loadError}
        </p>
      ) : null}

      {dashboard ? (
        <SecondarySalesClient accessToken={session.accessToken} initialDashboard={dashboard} />
      ) : null}
    </div>
  );
}
