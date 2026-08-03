import { type Metadata } from 'next';

import { HolidayManagement } from '@/components/admin/holiday-management';
import { getLeaveDashboard } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · Holidays',
  robots: { index: false, follow: false },
};

export default async function HolidaysPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) return <></>;

  let dashboard: Awaited<ReturnType<typeof getLeaveDashboard>> | null = null;
  let error: string | null = null;

  try {
    dashboard = await getLeaveDashboard(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (err instanceof ApiError) {
      error = err.problem.detail ?? err.problem.title;
    } else {
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Holidays</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Apply for PTO, review approvals, and maintain the company holiday calendar.
        </p>
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-sm">
          {error}
        </div>
      ) : dashboard ? (
        <HolidayManagement dashboard={dashboard} />
      ) : null}
    </div>
  );
}
