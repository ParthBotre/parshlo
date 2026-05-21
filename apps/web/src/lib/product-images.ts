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
export const PRODUCT_IMAGE_FILE_BY_SLUG: Record<string, string> = {
  'defcya-12-mg-cap': 'DEFCYA-12-MG-CAP.webp.png',
  'ironest-xt-tab': 'IRONEST-XT-TAB.webp',
  'metiace-tab': 'METIACE-TAB.webp',
  'protilo-kesar': 'PROTILO-200-GM-POWEDER-KESAR.webp',
  'tremecya-d-tab': 'TREMECYA-D.webp.png',
  'tremecya-tab': 'TREMECYA.webp.png',
  'upfolet-tab': 'UPFOLATE.webp.png',
};

export function productImageUrl(slug: string): string {
  return `/product-images/${PRODUCT_IMAGE_FILE_BY_SLUG[slug] ?? `${slug}.webp`}`;
}
