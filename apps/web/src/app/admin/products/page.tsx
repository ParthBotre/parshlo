import { type Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { listBuyerCatalog } from '@/lib/api/products';
import { getSession } from '@/lib/auth/session';
import { formatINR } from '@/lib/utils';

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
        <p className="mt-1 text-sm text-muted-foreground">
          Inventory and pricing across every SKU. Editing UI ships in v2.1.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3 text-right">Wholesale</th>
                <th className="px-5 py-3 text-right">MRP</th>
                <th className="px-5 py-3 text-right">Stock</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-5 py-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.composition}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-5 py-3 text-right font-mono">
                    {formatINR(p.wholesalePricePaise)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                    {formatINR(p.mrpPaise)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{p.availableQty}</td>
                  <td className="px-5 py-3">
                    <Badge variant={p.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {p.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
