import { type PublicProductView } from '@parshlo/types';

// The September launch collection is the current fallback while an older API
// deployment still omits createdAt. Newer API responses take precedence.
const CURRENT_LAUNCH = [
  'apogest-sr-300',
  'ovaborn-xt',
  'niddydro-20-mg',
  'upfolet-nvp-2',
  'fertinest-f',
  'rgnest',
  'ovaborn',
  'apogest-sr-200',
  'niddydro-10',
] as const;

function launchRank(slug: string): number {
  const rank = CURRENT_LAUNCH.findIndex((candidate) => candidate === slug);
  return rank === -1 ? CURRENT_LAUNCH.length : rank;
}

function catalogTime(product: PublicProductView): number {
  return product.createdAt ? Date.parse(product.createdAt) : 0;
}

export function latestProducts(products: PublicProductView[], count = 4): PublicProductView[] {
  return [...products]
    .sort((a, b) => {
      const dateDifference = catalogTime(b) - catalogTime(a);
      if (dateDifference !== 0) return dateDifference;
      const launchDifference = launchRank(a.slug) - launchRank(b.slug);
      return launchDifference || a.name.localeCompare(b.name);
    })
    .slice(0, count);
}
