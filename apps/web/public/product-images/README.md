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

## Seeded products (current slugs)

| Slug                 | Product                    | Drop file as             |
| -------------------- | -------------------------- | ------------------------ |
| `amoxicillin-500`    | Amoxicillin 500 mg         | `amoxicillin-500.jpg`    |
| `paracetamol-650`    | Paracetamol 650 mg         | `paracetamol-650.jpg`    |
| `metformin-500`      | Metformin HCl 500 mg       | `metformin-500.jpg`      |
| `salbutamol-inhaler` | Salbutamol Inhaler 100 mcg | `salbutamol-inhaler.jpg` |
| `pantoprazole-40`    | Pantoprazole 40 mg         | `pantoprazole-40.jpg`    |
| `amlodipine-5`       | Amlodipine 5 mg            | `amlodipine-5.jpg`       |

## Recommended specs

- **Format**: JPG (preferred), PNG, or WebP.
- **Aspect**: square (1:1) renders best across all three layouts. The detail
  page uses a 1:1 hero, cards crop to a roomy strip.
- **Size**: 800×800 to 1200×1200 is plenty. Files are served as-is — keep
  them under ~300 KB if you can.
- **Color**: white or neutral background works best with the cream card UI.
- **Naming**: lowercase, hyphens only, no spaces, no special characters.

## Adding a new product

When a new product is seeded, just drop `<new-slug>.jpg` in this folder. No
code change is required — the component re-resolves on every render.

## Going to production

For prod, replace this static folder with S3-presigned URLs returned by the
API (`Product.imageKeys`). The `<ProductImage />` component will accept those
URLs unchanged — only the resolution helper needs to switch.
