const DEFAULT_OFFSET = "+02:00";

function getOffset(): string {
  const raw = (process.env.APP_TZ_OFFSET ?? DEFAULT_OFFSET).trim();
  // Accept "+HH:MM" or "-HH:MM"
  if (/^[+-]\d{2}:\d{2}$/.test(raw)) return raw;
  return DEFAULT_OFFSET;
}

function offsetMs(offset: string): number {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!m) return 2 * 60 * 60 * 1000;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2], 10);
  const minutes = parseInt(m[3], 10);
  return sign * (hours * 60 + minutes) * 60 * 1000;
}

export function catDateKeyFromNow(now: Date = new Date()): string {
  // Shift into CAT, then take the UTC date portion.
  const shifted = new Date(now.getTime() + offsetMs(getOffset()));
  return shifted.toISOString().slice(0, 10);
}

export function catHour(date: Date): number {
  // Derive hour-of-day in CAT independent of server timezone.
  const shifted = new Date(date.getTime() + offsetMs(getOffset()));
  return shifted.getUTCHours();
}

export function catDayBounds(dateKey: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("date must be YYYY-MM-DD");
  }
  const off = getOffset();
  const start = new Date(`${dateKey}T00:00:00${off}`);
  const end = new Date(`${dateKey}T23:59:59.999${off}`);
  return { start, end };
}

export function isNaiveLocalDateTimeString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // e.g. "2026-04-26T17:00" or "2026-04-26T17:00:00"
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value);
}

