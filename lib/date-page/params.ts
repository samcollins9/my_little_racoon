import {
  DateInputError,
  assertDateInSupportedRange,
  calculationInstantForDate,
} from "../ephemeris/adapter";

/**
 * Sprint 28, decision (d): "today" is the UTC calendar date. Takes `now`
 * explicitly so the midnight boundary is unit-testable; callers in a
 * request path pass nothing and get the request's own clock (R2: computed
 * per request, never at build time).
 */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Sprint 47, R1: the one rule for "the future". A date after today (UTC,
 * utcToday above) is refused everywhere -- the date page and the picker's
 * target redirect it to today, the picker's `max` stops at today, and
 * neither horoscope write path will write it. Today itself is allowed.
 * Zero-padded YYYY-MM-DD, so string order is date order (Sprint 32).
 */
export function isAfterToday(isoDate: string, now: Date = new Date()): boolean {
  return isoDate > utcToday(now);
}

/** Sprint 47: the user's wording (25 Nov 2026), wherever a future date is refused. */
export const FUTURE_DATE_MESSAGE = "Reloy predicts only the past.";

/**
 * Sprint 47, R5: the calendar date `days` days from `isoDate`, in UTC, so
 * month ends, year ends and 29 February come out right. `isoDate` must be
 * a valid YYYY-MM-DD; the result isn't range-checked here.
 */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * R1/R7: the one validator for a date-page parameter. Returns the date
 * unchanged when it is a real YYYY-MM-DD calendar date inside the engine's
 * supported range, and null for anything else -- callers turn null into
 * the same notFound() an unknown reading id gets.
 *
 * Reuses the adapter's own rules rather than restating them: the
 * round-trip check that rejects 2024-02-30, and assertDateInSupportedRange.
 * The range is checked at the calculation instant (CALCULATION_HOUR_UTC on
 * that date), which is the instant computePositions is actually called
 * with, so a date this accepts is a date the page can always render.
 */
export function parseDatePageParam(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    assertDateInSupportedRange(calculationInstantForDate(raw));
    return raw;
  } catch (err) {
    if (err instanceof DateInputError) return null;
    throw err;
  }
}

/** The one place the date page's path shape is spelled out. */
export function datePagePath(isoDate: string): string {
  return `/date/${isoDate}`;
}
