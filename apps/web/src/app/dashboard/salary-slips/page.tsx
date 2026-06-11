import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SalarySlipDownloadButton } from '@/components/dashboard/salary-slip-download-button';
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

export default async function SalarySlipsPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/salary-slips');
  }

  let salarySlips: Awaited<ReturnType<typeof listMySalarySlips>> = [];
  try {
    salarySlips = await listMySalarySlips(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

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
        <CardContent className="p-0">
          {salarySlips.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              No salary slips have been generated yet.
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
                  {salarySlips.map((slip) => (
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
