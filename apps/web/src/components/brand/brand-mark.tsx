import { cn } from '@/lib/utils';

export interface BrandMarkProps {
  /**
   * `mark` is the logomark only (square-ish, transparent) — for tight spaces.
   * `lockup` is the full logomark + "PARSHLO" wordmark — for headers/splash/marketing.
   */
  variant?: 'mark' | 'lockup';
  /**
   * Rendered HEIGHT in pixels. Width is computed from the asset's intrinsic
   * aspect ratio so the lockup never gets distorted. Defaults: mark 32, lockup 48.
   */
  size?: number;
  className?: string;
  /** Accessible label. Hidden for purely decorative usages. */
  alt?: string;
  /** Set to true when the logo is above the fold so the browser preloads it. */
  priority?: boolean;
}

// Intrinsic aspect ratios baked from `build:brand` output.
//   mark   = 256 × 211  → width/height = 1.213
//   lockup = 542 × 600  → width/height = 0.903
const ASPECT = {
  mark: 256 / 211,
  lockup: 542 / 600,
} as const;

/**
 * Renders the Parshlo brand mark from `/brand/`. Uses a plain `<img>` (not
 * `next/image`) because the assets are already WebP-optimized and small (~6KB);
 * Next's image pipeline would add cost without benefit at this asset size.
 */
export function BrandMark({
  variant = 'mark',
  size,
  className,
  alt = 'Parshlo',
  priority = false,
}: BrandMarkProps): JSX.Element {
  const isMark = variant === 'mark';
  const height = size ?? (isMark ? 32 : 48);
  const width = Math.round(height * ASPECT[variant]);
  const src = isMark ? '/brand/parshlo-mark.webp' : '/brand/parshlo-lockup.webp';
  const srcSet = isMark ? `/brand/parshlo-mark.webp 1x, /brand/parshlo-mark@2x.webp 2x` : undefined;

  return (
    // Plain <img> is intentional: the asset is already WebP-optimized at
    // ~6 KB by build-brand-assets.ts, so next/image's transform pipeline adds
    // CPU without saving bytes. We also need this to render reliably in tight
    // headers without layout shift, which next/image's optimizer can introduce.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}
