import { ArrowLeft, BadgeCheck, FlaskConical, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPublicProduct, listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const products = await listPublicProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await getPublicProduct(slug);
    return {
      title: p.name,
      description: `${p.composition}. ${p.form} · ${p.packaging}.`,
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const { slug } = await params;
  let product;
  try {
    product = await getPublicProduct(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="container max-w-5xl py-12 md:py-16">
      <Link
        href="/products"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <div className="ring-brand-200/60 aspect-square w-full overflow-hidden rounded-2xl ring-1">
            <ProductImage
              slug={product.slug}
              alt={product.name}
              className="h-full w-full"
              iconClassName="h-24 w-24"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Badge variant="secondary">{product.category}</Badge>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-base">{product.composition}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Strength" value={product.strength} />
            <Field label="Form" value={product.form} />
            <Field label="Packaging" value={product.packaging} value2 />
            <Field label="Manufacturer" value={product.manufacturer} value2 />
          </div>

          <div className="flex flex-wrap gap-2">
            {product.prescriptionRequired ? (
              <Badge variant="warning" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Prescription required
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5" />
                OTC
              </Badge>
            )}
            {product.scheduleDrug !== 'NONE' ? (
              <Badge variant="outline" className="gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                {product.scheduleDrug.replace('_', ' ')}
              </Badge>
            ) : null}
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <h3 className="font-display text-base font-semibold">Wholesale ordering</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Pricing, MOQ, and real-time inventory are available to verified B2B accounts.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/auth/register">Request access</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="prose prose-sm text-foreground/90 md:prose-base mt-12 max-w-none">
        <h2>About this product</h2>
        <p>{product.description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  value2 = false,
}: {
  label: string;
  value: string;
  value2?: boolean;
}): JSX.Element {
  return (
    <div className={value2 ? 'col-span-2' : ''}>
      <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
