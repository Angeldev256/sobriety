import { TZDate } from "@date-fns/tz";
import { format, subDays } from "date-fns";

export const SECONDS_PER_DAY = 86_400;

export type Duration = {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Elapsed sober time between `start` and `now`. Never negative (future start dates read as zero). */
export function soberDuration(start: Date, now: Date = new Date()): Duration {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  return {
    totalSeconds,
    days: Math.floor(totalSeconds / SECONDS_PER_DAY),
    hours: Math.floor((totalSeconds % SECONDS_PER_DAY) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Whole sober days (completed 24h periods) since `start`. */
export function soberDays(start: Date, now: Date = new Date()): number {
  return soberDuration(start, now).days;
}

/** The calendar date (yyyy-MM-dd) of `instant` in the given IANA time zone. */
export function localDateString(instant: Date, timeZone: string): string {
  return format(new TZDate(instant.getTime(), safeTimeZone(timeZone)), "yyyy-MM-dd");
}

/** The calendar date `n` days before a yyyy-MM-dd date string. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return format(subDays(new Date(y, m - 1, d), -days), "yyyy-MM-dd");
}

/** Falls back to UTC for unknown/garbage zone names instead of throwing. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** The local wall-clock time (HH:mm) of `instant` in a time zone. */
export function localTimeString(instant: Date, timeZone: string): string {
  return format(new TZDate(instant.getTime(), safeTimeZone(timeZone)), "HH:mm");
}
