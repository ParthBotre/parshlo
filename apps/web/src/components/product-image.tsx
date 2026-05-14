'use client';

import { Pill } from 'lucide-react';
import { useState } from 'react';

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
  /** Tailwind classes applied to the rendered <img> AND the fallback box. */
  className?: string;
  /** Tailwind classes for the fallback Pill icon (size, color). */
  iconClassName?: string;
}

export function ProductImage({
  slug,
  alt,
  className,
  iconClassName,
}: ProductImageProps): JSX.Element {
  const [extIdx, setExtIdx] = useState(0);

  if (extIdx >= EXTS.length) {
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
      src={`/product-images/${slug}.${EXTS[extIdx]}`}
      alt={alt}
      // `object-contain` shows the full product (no cropping). White letterbox
      // bands keep the pharma photo on a clean clinical background regardless of
      // the image's own aspect ratio.
      className={cn('h-full w-full bg-white object-contain p-2', className)}
      onError={() => setExtIdx((i) => i + 1)}
      loading="lazy"
      decoding="async"
    />
  );
}
