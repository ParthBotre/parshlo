import { type Metadata } from 'next';

import { EmployeeManagement } from '@/components/admin/employee-management';
import { listEmployees } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · Employees',
  robots: { index: false, follow: false },
};

export default async function EmployeesPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) return <></>;

  const canManageEmployees = session.user.roles.includes('SUPER_ADMIN');
  let employees: Awaited<ReturnType<typeof listEmployees>> = [];
  let error: string | null = null;

  if (canManageEmployees) {
    try {
      employees = await listEmployees(session.accessToken, { next: { revalidate: 0 } });
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.problem.detail ?? err.problem.title;
      } else {
        throw err;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Employees</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create, suspend, and update internal admin access without touching seed files.
        </p>
      </div>

      {!canManageEmployees ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Only super admins can manage employee access.
        </div>
      ) : error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-sm">
          {error}
        </div>
      ) : (
        <EmployeeManagement employees={employees} />
      )}
    </div>
  );
}
