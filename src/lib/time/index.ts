import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format as formatDate, parseISO } from 'date-fns';

/** Server-side "now" — the only place `new Date()` is allowed in app code. */
export function serverNow(): Date {
  return new Date();
}

/** Client-side "now". */
export function clientNow(): Date {
  return new Date();
}

export function toUtc(iso: string): Date {
  return parseISO(iso);
}

type FestivalContext = { timezone: string };

type UserContext = { timezone: string };

export function formatInFestivalTz(
  timestamp: string | Date,
  event: FestivalContext,
  pattern: string,
): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  return formatInTimeZone(date, event.timezone, pattern);
}

export function formatInUserTz(
  timestamp: string | Date,
  user: UserContext,
  pattern: string,
): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  return formatInTimeZone(date, user.timezone, pattern);
}

export function festivalNow(event: FestivalContext): Date {
  return toZonedTime(serverNow(), event.timezone);
}

export function formatUtc(timestamp: string | Date, pattern: string): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp;
  return formatDate(date, pattern);
}
