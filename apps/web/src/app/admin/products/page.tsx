import { Package } from 'lucide-react';
import { type Metadata } from 'next';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {products.length} SKUs in the catalog. Editing UI ships in v2.1.
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 p-12 text-center">
            <Package className="h-10 w-10 opacity-60" />
            <p className="text-sm">No products in the catalog yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => {
            const isLow = p.availableQty <= 200;
            const isOut = p.status === 'OUT_OF_STOCK' || p.availableQty <= 0;
            return (
              <Card key={p.id} className="h-full overflow-hidden">
                <div className="relative aspect-square overflow-hidden border-b">
                  <ProductImage
                    slug={p.slug}
                    alt={p.name}
                    className="h-full w-full"
                    iconClassName="h-16 w-16"
                  />
                  <Badge
                    variant={
                      p.status === 'ACTIVE'
                        ? 'success'
                        : p.status === 'DRAFT'
                          ? 'warning'
                          : 'destructive'
                    }
                    className="absolute right-3 top-3 shadow-sm backdrop-blur"
                  >
                    {p.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <CardContent className="space-y-3 p-4">
                  <Badge variant="secondary">{p.category}</Badge>
                  <div>
                    <h3 className="font-display text-base font-semibold leading-tight">{p.name}</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">{p.composition}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Field label="Form" value={p.form} />
                    <Field label="MOQ" value={String(p.moq)} />
                    <Field
                      label="Stock"
                      value={String(p.availableQty)}
                      tone={isOut ? 'danger' : isLow ? 'warning' : 'default'}
                    />
                    <Field label="GST" value={`${p.gstRate}%`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger';
}): JSX.Element {
  const valueClass =
    tone === 'danger'
      ? 'text-destructive font-semibold'
      : tone === 'warning'
        ? 'text-amber-600 font-semibold'
        : '';
  return (
    <div>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}
