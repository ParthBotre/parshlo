import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { PRICING_ENABLED } from './feature-flags';

/** Tailwind-aware className concatenation. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format paise as INR currency.
 *
 * Gated on `PRICING_ENABLED`. When the flag is off we render `—` everywhere
 * (single point of suppression so every table/card/cart layout stays intact).
 *
 * We deliberately avoid `Intl.NumberFormat({ style: 'currency' })` because
 * Node's ICU inserts a narrow no-break space between the ₹ symbol and the
 * digits but the browser's ICU does not, causing hydration mismatches.
 */
export function formatINR(paise: number): string {
  if (!PRICING_ENABLED) {
    return '—';
  }
  const amount = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
  return `₹${amount}`;
}
