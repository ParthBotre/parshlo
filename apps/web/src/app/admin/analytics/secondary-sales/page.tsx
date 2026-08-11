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
    year?: string;
    stockistId?: string;
  }>;
}

const MONTH_OPTIONS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

function defaultMonth(): string {
  return dateInputKeyIst().slice(0, 7);
}

function normalizePeriod(month: string | undefined, year: string | undefined): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) return month;
  if (month && year && /^\d{2}$/.test(month) && /^\d{4}$/.test(year)) {
    return `${year}-${month}`;
  }
  return defaultMonth();
}

function yearOptions(): string[] {
  const [yearRaw, monthRaw] = defaultMonth().split('-');
  const startYear = Number(yearRaw);
  const startMonth = Number(monthRaw);

  return Array.from(
    new Set(
      Array.from({ length: 36 }, (_, index) => {
        const date = new Date(Date.UTC(startYear, startMonth - 1 - index, 1));
        return String(date.getUTCFullYear());
      }),
    ),
  );
}

function monthFromPeriod(periodMonth: string): string {
  return periodMonth.slice(5, 7);
}

function yearFromPeriod(periodMonth: string): string {
  return periodMonth.slice(0, 4);
}

export default async function SecondarySalesPage({
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  const { month: rawMonth, year: rawYear, stockistId } = await searchParams;
  const periodMonth = normalizePeriod(rawMonth, rawYear);
  const years = yearOptions();

  let dashboard: Awaited<ReturnType<typeof getSecondarySalesDashboard>> | null = null;
  let loadError: string | null = null;
  try {
    dashboard = await getSecondarySalesDashboard(
      session.accessToken,
      { periodMonth, stockistId },
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
            Compare stockist primary sales from Parshlo orders against the month-end secondary sales
            values they report after selling onward to chemists.
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
                defaultValue={monthFromPeriod(dashboard?.periodMonth ?? periodMonth)}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-44"
              >
                {MONTH_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground grid gap-1 text-xs font-medium">
              Year
              <select
                name="year"
                defaultValue={yearFromPeriod(dashboard?.periodMonth ?? periodMonth)}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm sm:w-32"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            {dashboard?.selectedStockistId ? (
              <input type="hidden" name="stockistId" value={dashboard.selectedStockistId} />
            ) : null}
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
