import { type Metadata } from 'next';

import { GynaeShowcase } from '@/components/gynae-showcase';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Gynae Spotlight',
  description:
    'Explore the Parshlo gynaecology product collection, including Apogest, Rgnest, Ovaborn, and Niddydro.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SPOTLIGHT_NAMES = ['apogest', 'rgnest', 'ovaborn', 'niddydro'];
const FAMILY_ORDER = ['apogest', 'rgnest', 'ovaborn', 'niddydro'];

function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export default async function GynaeSpotlightPage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];

  try {
    products = (await listPublicProducts({ cache: 'no-store' }))
      .filter((product) =>
        SPOTLIGHT_NAMES.some((name) => normalizeProductName(product.name).includes(name)),
      )
      .sort((a, b) => {
        const aName = normalizeProductName(a.name);
        const bName = normalizeProductName(b.name);
        const aFamily = FAMILY_ORDER.findIndex((name) => aName.includes(name));
        const bFamily = FAMILY_ORDER.findIndex((name) => bName.includes(name));
        return aFamily - bFamily || (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return <GynaeShowcase products={products} />;
}
