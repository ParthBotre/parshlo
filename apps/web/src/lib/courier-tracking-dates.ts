import { formatDateTimeIst } from '@/lib/format-datetime';

/** Human-readable label for when courier booking was recorded. */
export function courierTrackingDateLabel(bookedAt?: string, updatedAt?: string): string | null {
  if (!bookedAt && !updatedAt) {
    return null;
  }
  const booked = bookedAt ? formatDateTimeIst(bookedAt) : null;
  const updated = updatedAt ? formatDateTimeIst(updatedAt) : null;
  if (booked && updated && booked !== updated) {
    return `First booked ${booked} · updated ${updated}`;
  }
  const when = updated ?? booked;
  return when ? `Booked with courier on ${when}` : null;
}
