import { type Metadata } from 'next';

import { KycActionRow } from '@/components/admin/kyc-action-row';
import { Card, CardContent } from '@/components/ui/card';
import { listPendingKyc } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'KYC Queue',
  robots: { index: false, follow: false },
};

export default async function KycQueuePage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  let queue: Awaited<ReturnType<typeof listPendingKyc>> = [];
  try {
    queue = await listPendingKyc(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">KYC Queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Verify GST, drug license, and pharmacy registration documents before approving B2B access.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {queue.length === 0 ? (
            <p className="text-muted-foreground p-12 text-center text-sm">
              No applications waiting. The queue is empty.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Business</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((row) => (
                  <KycActionRow
                    key={row.id}
                    id={row.id}
                    businessName={row.businessName}
                    status={row.status}
                    submittedAt={row.submittedAt}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
