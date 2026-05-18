import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import LogisticsPageClient from './logistics-client';

import {
  listCourierPartners,
  listLogisticsConsignments,
  listLogisticsStatements,
} from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · Finance · Logistics',
  robots: { index: false, follow: false },
};

export default async function LogisticsPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) redirect('/auth/sign-in?next=/admin/finance/logistics');

  const opts = { next: { revalidate: 0 } } as const;

  try {
    const [couriers, consignments, statements] = await Promise.all([
      listCourierPartners(session.accessToken, opts),
      listLogisticsConsignments(session.accessToken, opts),
      listLogisticsStatements(session.accessToken, opts),
    ]);

    return (
      <LogisticsPageClient
        accessToken={session.accessToken}
        couriers={couriers}
        consignments={consignments}
        statements={statements}
      />
    );
  } catch (err) {
    const msg =
      err instanceof ApiError
        ? (err.problem.detail ?? err.message)
        : 'Could not load logistics data.';
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Logistics Reconciliation
        </h1>
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
          {msg}
        </div>
      </div>
    );
  }
}
