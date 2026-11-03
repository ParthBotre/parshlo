import { type Metadata } from 'next';

import { HomeShowcase } from '@/components/home-showcase';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';
import { latestProducts } from '@/lib/latest-products';

export const metadata: Metadata = {
  title: 'Latest products',
  description: 'Discover the newest additions to the Parshlo pharmaceutical portfolio.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];
  try {
    products = await listPublicProducts({ cache: 'no-store' });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return <HomeShowcase spotlight={latestProducts(products)} productCount={products.length} />;
}
