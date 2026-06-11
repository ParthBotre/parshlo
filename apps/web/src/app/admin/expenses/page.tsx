import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ExpenseReview } from '@/components/admin/expense-review';
import { getHrDashboard } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Expenses',
  robots: { index: false, follow: false },
};

export default async function AdminExpensesPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/admin/expenses');
  }
  if (!session.user.roles.includes('SUPER_ADMIN')) {
    redirect('/admin');
  }

  let dashboard: Awaited<ReturnType<typeof getHrDashboard>> = {
    records: [],
    documents: [],
    salarySlips: [],
    expenses: [],
    workLogs: [],
  };
  try {
    dashboard = await getHrDashboard(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Expenses</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review monthly employee expense submissions.
        </p>
      </div>

      <ExpenseReview initialExpenses={dashboard.expenses} />
    </div>
  );
}
