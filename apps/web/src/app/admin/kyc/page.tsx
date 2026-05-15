import { type Metadata } from 'next';

import { KycApplicationCard } from '@/components/admin/kyc-application-card';
import { listPendingKyc } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';
import { formatDateTimeIst } from '@/lib/format-datetime';

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
          Review full business details before approving B2B access.
        </p>
      </div>

      {queue.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border p-12 text-center text-sm">
          No applications waiting. The queue is empty.
        </p>
      ) : (
        <div className="space-y-4">
          {queue.map((application) => (
            <KycApplicationCard
              key={application.id}
              application={{
                ...application,
                submittedAtLabel: formatDateTimeIst(application.submittedAt),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
