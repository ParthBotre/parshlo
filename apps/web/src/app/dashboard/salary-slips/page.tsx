import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SalarySlipDownloadButton } from '@/components/dashboard/salary-slip-download-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listMySalarySlips } from '@/lib/api/user';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatDateIst } from '@/lib/format-datetime';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Salary Slips',
  robots: { index: false, follow: false },
};

function monthLabel(periodMonth: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${periodMonth.slice(0, 7)}-01T00:00:00.000Z`));
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

function salaryYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => String(currentYear - 1 + index));
}

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default async function SalarySlipsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>;
}): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/salary-slips');
  }
  const params = (await searchParams) ?? {};

  let salarySlips: Awaited<ReturnType<typeof listMySalarySlips>> = [];
  try {
    salarySlips = await listMySalarySlips(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
  const latestPeriod = salarySlips[0]?.periodMonth.slice(0, 7) ?? currentPeriodMonth();
  const selectedYear =
    params.year && /^\d{4}$/.test(params.year) ? params.year : latestPeriod.slice(0, 4);
  const selectedMonth =
    params.month && /^\d{2}$/.test(params.month) ? params.month : latestPeriod.slice(5, 7);
  const selectedPeriod = `${selectedYear}-${selectedMonth}`;
  const filteredSalarySlips = salarySlips.filter(
    (slip) => slip.periodMonth.slice(0, 7) === selectedPeriod,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Salary Slips
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Download your monthly salary slips after Super Admin has finalized payment details.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            action="/dashboard/salary-slips"
          >
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Month</span>
              <select
                name="month"
                className="border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm sm:w-44"
                defaultValue={selectedMonth}
              >
                {MONTH_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Year</span>
              <select
                name="year"
                className="border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm sm:w-32"
                defaultValue={selectedYear}
              >
                {salaryYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="outline">
              Show Slip
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredSalarySlips.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No salary slip found for {monthLabel(`${selectedPeriod}-01`)}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Month</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Paid Days</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Transaction Date</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">NEFT/DD/CHQ No.</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right sm:px-5">Amount</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right sm:px-5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalarySlips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-accent/40 border-t">
                      <td className="whitespace-nowrap px-4 py-3 font-medium sm:px-5">
                        {monthLabel(slip.periodMonth)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">{slip.workingDays}</td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        {slip.transactionDate ? formatDateIst(slip.transactionDate) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        {slip.transactionReference ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono sm:px-5">
                        {formatINR(slip.netPayPaise)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                        <SalarySlipDownloadButton slipId={slip.id} />
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
