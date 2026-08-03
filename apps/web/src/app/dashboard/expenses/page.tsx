import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ExpenseSubmission } from '@/components/dashboard/expense-submission';
import { listMyExpenses } from '@/lib/api/user';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Expenses',
  robots: { index: false, follow: false },
};

export default async function ExpensesPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/expenses');
  }

  let expenses: Awaited<ReturnType<typeof listMyExpenses>> = [];
  try {
    expenses = await listMyExpenses(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Expenses</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Submit monthly field expenses for Super Admin approval.
        </p>
      </div>

      <ExpenseSubmission initialExpenses={expenses} />
    </div>
  );
}
