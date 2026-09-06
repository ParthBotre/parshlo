'use client';

import { Pill } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PRODUCT_IMAGE_FILE_BY_SLUG } from '@/lib/product-images';
import { cn } from '@/lib/utils';

/**
 * Renders a product image from `apps/web/public/product-images/<slug>.<ext>`.
 *
 * Tries `.webp` first (the compressed dist created by `pnpm compress:product-images`),
 * then `.jpg` / `.png` for SKUs we haven't compressed yet. If nothing matches,
 * falls back to a styled Pill placeholder so missing assets never break the page.
 * Parent controls the box (height/width/aspect) via `className`.
 *
 * We deliberately use a native <img> rather than next/image:
 *   - The dev workflow (drop a file in /public/product-images) needs no config.
 *   - The product catalog is small; image-CDN optimization isn't a bottleneck.
 *   - It lets the parent fully own layout via Tailwind utilities — no need to
 *     mark every container as `position: relative` for `fill` mode.
 */
const EXTS = ['webp', 'jpg', 'png'] as const;

export interface ProductImageProps {
  slug: string;
  alt: string;
  /** Optional array of image URLs (e.g. from Cloudflare R2 uploads or product.imageUrls). */
  imageUrls?: string[] | null;
  /** Optional direct src URL. */
  src?: string | null;
  /** Tailwind classes applied to the rendered <img> AND the fallback box. */
  className?: string;
  /** Tailwind classes for the fallback Pill icon (size, color). */
  iconClassName?: string;
}

export function ProductImage({
  slug,
  alt,
  imageUrls,
  src,
  className,
  iconClassName,
}: ProductImageProps): JSX.Element {
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (src) list.push(src);
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        if (!url) continue;
        const normalized = url.startsWith('http://localhost')
          ? url.replace(/^http:\/\/localhost(:\d+)?/, '')
          : url;
        list.push(normalized);
      }
    }
    const uploadedFile = PRODUCT_IMAGE_FILE_BY_SLUG[slug];
    if (uploadedFile) {
      list.push(`/product-images/${uploadedFile}`);
    }
    for (const ext of EXTS) {
      list.push(`/product-images/${slug}.${ext}`);
    }
    return list;
  }, [slug, src, imageUrls]);
  const [imageIdx, setImageIdx] = useState(0);

  useEffect(() => {
    setImageIdx(0);
  }, [slug, src, imageUrls]);

  if (imageIdx >= candidates.length) {
    return (
      <div
        className={cn(
          'from-brand-50 to-brand-100 text-brand-600 flex items-center justify-center bg-gradient-to-br',
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <Pill className={cn('h-10 w-10', iconClassName)} aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={candidates[imageIdx]}
      alt={alt}
      // `object-contain` shows the full product (no cropping). White letterbox
      // bands keep the pharma photo on a clean clinical background regardless of
      // the image's own aspect ratio.
      className={cn('h-full w-full bg-white object-contain p-2', className)}
      onError={() => setImageIdx((i) => i + 1)}
      loading="lazy"
      decoding="async"
    />
  );
}
