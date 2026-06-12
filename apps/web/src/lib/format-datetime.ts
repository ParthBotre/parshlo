/** Stable IST display for SSR (avoids server/client `toLocaleString` AM/am mismatch). */
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

function pad2(value: string): string {
  return value.padStart(2, '0');
}

export function formatDateTimeIst(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
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

export function formatDateIst(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date(iso));
  const v = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${v('day')}/${v('month')}/${v('year')}`;
}

export function formatDateKeyDisplay(dateKey: string): string {
  const [year = '', month = '', day = ''] = dateKey.split('-');
  if (!year || !month || !day) return dateKey;
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

export function dateInputKeyIst(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const v = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${v('year')}-${v('month')}-${v('day')}`;
}
