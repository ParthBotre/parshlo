import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BuyerCatalog } from '@/components/dashboard/buyer-catalog';
import { listBuyerCatalog } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Products',
  robots: { index: false, follow: false },
};

export default async function CatalogPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect('/auth/sign-in?next=/dashboard/catalog');
  }

  let products: Awaited<ReturnType<typeof listBuyerCatalog>> = [];
  let error: string | null = null;
  try {
    products = await listBuyerCatalog(session.accessToken, { next: { revalidate: 30 } });
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1 text-sm">Wholesale pricing for your account.</p>
      </div>

      {error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-sm">
          <p>{error}</p>
          {error.toLowerCase().includes('not yet approved') ? (
            <p className="text-muted-foreground mt-2">
              Your B2B application is still in review. You will be able to browse pricing and place
              orders once an admin approves your account.
            </p>
          ) : null}
        </div>
      ) : (
        <BuyerCatalog products={products} />
      )}
    </div>
  );
}
