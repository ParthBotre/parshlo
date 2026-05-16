import { type Metadata } from 'next';

import { AdminPlaceOrderPanel } from '@/components/admin/admin-place-order-panel';
import { listAllBuyers } from '@/lib/api/admin';
import { listBuyerCatalog } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · Place order',
  robots: { index: false, follow: false },
};

export default async function AdminPlaceOrderPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }

  let buyers: Awaited<ReturnType<typeof listAllBuyers>> = [];
  let products: Awaited<ReturnType<typeof listBuyerCatalog>> = [];
  let error: string | null = null;

  try {
    [buyers, products] = await Promise.all([
      listAllBuyers(session.accessToken, { next: { revalidate: 0 } }),
      listBuyerCatalog(session.accessToken, { next: { revalidate: 30 } }),
    ]);
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Place order</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create a B2B order on behalf of a verified buyer — useful when they request assistance by
          phone or email.
        </p>
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-sm">
          {error}
        </div>
      ) : (
        <AdminPlaceOrderPanel buyers={buyers} products={products} />
      )}
    </div>
  );
}
