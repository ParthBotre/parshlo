import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { WorkReportSubmission } from '@/components/dashboard/work-report-submission';
import { listMyWorkLogs } from '@/lib/api/user';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Work Reports',
  robots: { index: false, follow: false },
};

export default async function WorkReportsPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/reports');
  }

  let reports: Awaited<ReturnType<typeof listMyWorkLogs>> = [];
  try {
    reports = await listMyWorkLogs(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Work Reports
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit daily field reporting. Approved holidays and submitted reports feed HR payroll.
        </p>
      </div>

      <WorkReportSubmission initialReports={reports} />
    </div>
  );
}
