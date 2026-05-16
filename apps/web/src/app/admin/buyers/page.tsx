import { type Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { listAllBuyers } from '@/lib/api/admin';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · Buyers',
  robots: { index: false, follow: false },
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
  APPROVED: 'success',
  PENDING_VERIFICATION: 'warning',
  UNDER_REVIEW: 'secondary',
  REJECTED: 'warning',
  SUSPENDED: 'warning',
};

export default async function BuyersPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }
  let buyers: Awaited<ReturnType<typeof listAllBuyers>> = [];
  try {
    buyers = await listAllBuyers(session.accessToken, { next: { revalidate: 0 } });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Buyers</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3">Business</th>
                  <th className="whitespace-nowrap px-5 py-3">Contact</th>
                  <th className="whitespace-nowrap px-5 py-3">GSTIN</th>
                  <th className="whitespace-nowrap px-5 py-3">Mobile</th>
                  <th className="whitespace-nowrap px-5 py-3">Type</th>
                  <th className="whitespace-nowrap px-5 py-3">Drug License</th>
                  <th className="whitespace-nowrap px-5 py-3">City</th>
                  <th className="whitespace-nowrap px-5 py-3">State</th>
                  <th className="whitespace-nowrap px-5 py-3">Status</th>
                  <th className="whitespace-nowrap px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="whitespace-nowrap px-5 py-3 font-medium">
                      {b.businessName ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <p className="whitespace-nowrap">{b.fullName}</p>
                      <p className="text-muted-foreground whitespace-nowrap text-xs">{b.email}</p>
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3 font-mono text-xs">
                      {b.gstin ?? '—'}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                      {b.mobile ?? '—'}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                      {b.businessType ?? '—'}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                      {b.drugLicenseNumber ?? '—'}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                      {b.city ?? '—'}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                      {b.state ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge variant={STATUS_VARIANTS[b.accountStatus] ?? 'secondary'}>
                        {b.accountStatus.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-5 py-3">
                      {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
