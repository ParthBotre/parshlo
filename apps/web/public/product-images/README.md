# Product images

Drop product photos in this folder. Files are served by Next.js at
`/product-images/<filename>` and consumed by the `<ProductImage />` component
on the public catalog, the public product detail page, and the buyer catalog.

## Naming convention

Use the **product slug** + `.jpg`:

```
apps/web/public/product-images/<slug>.jpg
```

The component will auto-resolve the URL for each product. If an image is
missing the UI falls back to the gradient + pill icon placeholder, so you can
add images incrementally.

## Current catalog slugs

The live catalog is database-driven. Do not use `seed.ts` to change staging or production products.

To confirm a live product slug, check the product in the admin portal or query the API/database. The expected image file is:

```
apps/web/public/product-images/<product-slug>.jpg
```

## Recommended specs

- **Format**: JPG (preferred), PNG, or WebP.
- **Aspect**: square (1:1) renders best across all three layouts. The detail
  page uses a 1:1 hero, cards crop to a roomy strip.
- **Size**: 800×800 to 1200×1200 is plenty. Files are served as-is — keep
  them under ~300 KB if you can.
- **Color**: white or neutral background works best with the cream card UI.
- **Naming**: lowercase, hyphens only, no spaces, no special characters.

## Adding or changing a product image

1. Create or edit the product in the admin portal/database first.
2. Confirm the product slug.
3. Drop `<slug>.jpg` in this folder.
4. Deploy the web app.

No API deploy is required for static product image changes unless the product record itself also changed through code/migrations.

## Going to production

Static images are acceptable for the first production launch. A future image manager can move product assets to S3/R2 or another object store and have the API return image URLs. The `<ProductImage />` component is intentionally isolated so that switch stays small.
