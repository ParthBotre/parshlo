'use client';

import { Pill } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Renders a product image from `apps/web/public/products/<slug>.<ext>`.
 *
 * Tries `.jpg`, `.png`, `.webp` in order. If none are found, falls back to a
 * styled Pill placeholder so missing assets never break the page. Parent
 * controls the box (height/width/aspect) via `className`.
 *
 * We deliberately use a native <img> rather than next/image:
 *   - The dev workflow (drop a file in /public/products) needs no extra config.
 *   - The product catalog is small; image-CDN optimization isn't a bottleneck.
 *   - It lets the parent fully own layout via Tailwind utilities — no need to
 *     mark every container as `position: relative` for `fill` mode.
 */
const EXTS = ['jpg', 'png', 'webp'] as const;

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
      src={`/products/${slug}.${EXTS[extIdx]}`}
      alt={alt}
      className={cn('object-cover', className)}
      onError={() => setExtIdx((i) => i + 1)}
      loading="lazy"
      decoding="async"
    />
  );
}
