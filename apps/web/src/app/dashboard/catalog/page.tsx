import { type Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BuyerCatalog } from '@/components/dashboard/buyer-catalog';
import { ApiError } from '@/lib/api-client';
import { listBuyerCatalog } from '@/lib/api/products';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Catalog',
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live wholesale pricing. Minimum order quantities apply.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <BuyerCatalog products={products} accessToken={session.accessToken} />
      )}
    </div>
  );
}
