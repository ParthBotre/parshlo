/** Clamp order quantity to at least 1 and at most available stock. */
export function clampCartQuantity(qty: number, maxQty: number): number {
  const max = Math.max(1, Math.floor(maxQty));
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
