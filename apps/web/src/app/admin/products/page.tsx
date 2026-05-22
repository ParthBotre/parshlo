import { Package } from 'lucide-react';
import { type Metadata } from 'next';

import { ProductManagement } from '@/components/admin/product-management';
import { Card, CardContent } from '@/components/ui/card';
import { listAdminProducts } from '@/lib/api/admin';
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
  const canManageProducts = session.user.roles.some(
    (role) => role === 'ADMIN' || role === 'SUPER_ADMIN',
  );
  let products: Awaited<ReturnType<typeof listAdminProducts>> = [];
  let error: string | null = null;
  if (canManageProducts) {
    try {
      products = await listAdminProducts(session.accessToken, { next: { revalidate: 0 } });
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.problem.detail ?? err.problem.title;
      } else {
        throw err;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {products.length} SKUs listed. Add drafts, update rates, and disable old products safely.
        </p>
      </div>

      {!canManageProducts ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Only admins and super admins can manage products.
        </div>
      ) : error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-sm">
          {error}
        </div>
      ) : null}

      {!error && products.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 p-12 text-center">
            <Package className="h-10 w-10 opacity-60" />
            <p className="text-sm">No products yet.</p>
            <p className="text-xs opacity-80">
              Run <code className="font-mono">make db-seed</code> if this is a fresh database.
            </p>
          </CardContent>
        </Card>
      ) : !error ? (
        <ProductManagement products={products} />
      ) : null}
    </div>
  );
}
