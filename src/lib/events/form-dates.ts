import { fromZonedTime } from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

/** Value for `<input type="datetime-local" />` in the festival timezone. */
export function toDatetimeLocalInput(iso: string, timezone: string): string {
  return formatInTimeZone(parseISO(iso), timezone, "yyyy-MM-dd'T'HH:mm");
}

/** Parse datetime-local string as festival-local time → UTC ISO. */
export function datetimeLocalToUtcIso(value: string, timezone: string): string {
  return fromZonedTime(value, timezone).toISOString();
}
