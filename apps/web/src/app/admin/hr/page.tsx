import { type Metadata } from 'next';

import { HrManagement } from '@/components/admin/hr-management';
import { getHrDashboard, listEmployees } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · HR',
  robots: { index: false, follow: false },
};

export default async function HrPage(): Promise<JSX.Element> {
  const session = await getSession();
  const canManageHr = session?.user.roles.includes('SUPER_ADMIN') ?? false;
  let employees: Awaited<ReturnType<typeof listEmployees>> = [];
  let dashboard: Awaited<ReturnType<typeof getHrDashboard>> = {
    records: [],
    documents: [],
    salarySlips: [],
    expenses: [],
    workLogs: [],
    leaveRequests: [],
  };

  if (session && canManageHr) {
    try {
      [employees, dashboard] = await Promise.all([
        listEmployees(session.accessToken, { next: { revalidate: 0 } }),
        getHrDashboard(session.accessToken, { next: { revalidate: 0 } }),
      ]);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">HR</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Employee records, appointment documents, and Super Admin salary slip controls.
        </p>
      </div>

      {!canManageHr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Only super admins can access HR records.
        </div>
      ) : (
        <HrManagement employees={employees} dashboard={dashboard} />
      )}
    </div>
  );
}
