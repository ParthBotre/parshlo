export const UNLIMITED_CART_QTY = 999_999;

/** Clamp order quantity to at least 1 and at most the configured order safety cap. */
export function clampCartQuantity(qty: number, maxQty: number): number {
  const max = Number.isFinite(maxQty) && maxQty > 0 ? Math.floor(maxQty) : UNLIMITED_CART_QTY;
  const value = Math.floor(qty);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(max, Math.max(1, value));
}

/** Parse a user-typed quantity; returns null when the field is empty or invalid. */
export function parseCartQuantityInput(raw: string, maxQty: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return clampCartQuantity(parsed, maxQty);
}
