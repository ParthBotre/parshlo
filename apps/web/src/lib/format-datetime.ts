/** Stable IST display for SSR (avoids server/client `toLocaleString` AM/am mismatch). */
export function formatDateTimeIst(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const v = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';

  return `${v('day')}/${v('month')}/${v('year')}, ${v('hour')}:${v('minute')}:${v('second')} IST`;
}
