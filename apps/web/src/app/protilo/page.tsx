import { type Metadata } from 'next';

import { ProtiloShowcase } from '@/components/protilo-showcase';
import { listPublicProducts } from '@/lib/api/products';
import { ApiError } from '@/lib/api-client';

export const metadata: Metadata = {
  title: 'Protilo Protein Powders',
  description:
    'Explore the full Protilo protein powder range from Parshlo, including DM, SF, chocolate, and kesar variants.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VARIANT_ORDER = [
  'protilo-dm',
  'protilo-sf-200-gm-powder-chocolate',
  'protilo-sf-200-gm-powder-kesar',
  'protilo-200-gm-powder-chocolate',
  'protilo-200-gm-powder-kesar',
];

export default async function ProtiloPage(): Promise<JSX.Element> {
  let products: Awaited<ReturnType<typeof listPublicProducts>> = [];

  try {
    products = (await listPublicProducts({ cache: 'no-store' }))
      .filter(
        (product) => product.name.toLowerCase().includes('protilo') && product.form === 'POWDER',
      )
      .sort((a, b) => {
        const aIndex = VARIANT_ORDER.indexOf(a.slug);
        const bIndex = VARIANT_ORDER.indexOf(b.slug);
        return (
          (aIndex < 0 ? VARIANT_ORDER.length : aIndex) -
            (bIndex < 0 ? VARIANT_ORDER.length : bIndex) || a.name.localeCompare(b.name)
        );
      });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }

  return <ProtiloShowcase products={products} />;
}
