# Product images

Drop product images into this folder using the exact filenames below. They'll
automatically appear on:

- the public catalog: `/products`
- the public product detail page: `/products/[slug]`
- the buyer catalog: `/dashboard/catalog`

If an image is missing for a product, the UI falls back to the Pill icon
placeholder — nothing breaks.

## Naming convention

One file per product, named exactly `<slug>.<ext>`, where `<ext>` is one of
`jpg`, `png`, or `webp`. JPEG is preferred for product photography.

The component tries `.jpg`, then `.png`, then `.webp`. The first one found is
served. Pick **one** extension per product; mixing won't help.

## Recommended specs

| Property       | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| Aspect ratio   | 1:1 (square) — cards crop to fit                                    |
| Min dimensions | 600×600 px                                                          |
| Recommended    | 1200×1200 px                                                        |
| Format         | JPEG (`.jpg`) for photography; PNG/WebP for line art / transparency |
| Max file size  | < 300 KB per image (compress with `cwebp` or `mozjpeg`)             |
| Color space    | sRGB                                                                |

## Currently seeded slugs

Drop one image per slug:

```
products/
├── amoxicillin-500.jpg
├── paracetamol-650.jpg
├── metformin-500.jpg
├── salbutamol-inhaler.jpg
├── pantoprazole-40.jpg
└── amlodipine-5.jpg
```

If you're adding new products later, the slug is whatever you set in
`packages/db/prisma/seed.ts` (or the future admin product form).

## Git tracking

These images are tracked in git by default (so they ship with the repo). If
you'd rather store them in S3 or a CDN, add an entry to `.gitignore`:

```
apps/web/public/products/*.jpg
apps/web/public/products/*.png
apps/web/public/products/*.webp
```

…and the production deploy will fetch them from S3 via the `imageKeys` column
on the `Product` model instead.

## Production path

In production, the API resolves `product.imageKeys` (S3 object keys) into
short-lived signed URLs. The dev workflow above is a local shortcut — the
underlying `imageKeys` schema column is unchanged, so swapping to S3 is a
configuration change, not a code change.
