'use client';

import { Pill } from 'lucide-react';
import { useState } from 'react';

import { productImageUrl } from '@/lib/product-images';
import { cn } from '@/lib/utils';

/**
 * Renders a product photo with a graceful fallback.
 *
 * - Tries to load `/product-images/<slug>.jpg`.
 * - If the file is missing (or any load error) it falls back to a soft
 *   gradient + pill icon so the layout never breaks.
 *
 * Marked `'use client'` because we need React state to track the
 * onError → fallback transition. The wrapping pages can stay server
 * components.
 */
export function ProductImage({
  slug,
  alt,
  className,
  iconClassName,
}: {
  slug: string;
  alt: string;
  className?: string;
  iconClassName?: string;
}): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          'from-brand-50 to-brand-100 text-brand-600 flex items-center justify-center bg-gradient-to-br',
          className,
        )}
      >
        <Pill className={cn('h-10 w-10', iconClassName)} aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- onError fallback is incompatible with next/image without further plumbing; local public assets are already small.
    <img
      src={productImageUrl(slug)}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
      loading="lazy"
      decoding="async"
    />
  );
}
