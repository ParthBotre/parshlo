import { Package } from 'lucide-react';
import { type Metadata } from 'next';

import { AdminCatalogGrid } from '@/components/catalog/admin-catalog-grid';
import { Card, CardContent } from '@/components/ui/card';
import { listBuyerCatalog } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin · Products',
  robots: { index: false, follow: false },
};

export default async function AdminProductsPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return <></>;
  }
  let products: Awaited<ReturnType<typeof listBuyerCatalog>> = [];
  try {
    products = await listBuyerCatalog(session.accessToken, { next: { revalidate: 30 } });
  } catch (err) {
    if (!(err instanceof ApiError)) {
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {products.length} SKUs in the catalog. Editing UI ships in v2.1.
        </p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 p-12 text-center">
            <Package className="h-10 w-10 opacity-60" />
            <p className="text-sm">No products in the catalog yet.</p>
          </CardContent>
        </Card>
      ) : (
        <AdminCatalogGrid products={products} />
      )}
    </div>
  );
}
