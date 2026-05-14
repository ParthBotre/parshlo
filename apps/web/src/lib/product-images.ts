/**
 * Resolve a product's image URL from its slug.
 *
 * Convention: drop `<slug>.jpg` into `apps/web/public/product-images/` and it
 * will be served at `/product-images/<slug>.jpg`. See the folder's README
 * for the full naming guide.
 *
 * If we ever move images to S3 in production, this is the only function that
 * needs to change — all callers stay the same.
 */
export function productImageUrl(slug: string): string {
  return `/product-images/${slug}.jpg`;
}
