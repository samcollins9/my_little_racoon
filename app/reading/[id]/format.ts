import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";

/**
 * Presentation-only helpers for screen 2a (docs/design/HANDOFF_reading_responsive.md)
 * that don't belong in display.ts -- Sprint 19 leaves display.ts unchanged
 * by name (Out of Scope), and the handoff's short right-aligned status
 * label ("this exact date" / "on this day, other years") is different
 * copy from eventsLabel()'s full-sentence fallback, not a replacement
 * for it -- eventsLabel still renders in place of the event list itself
 * when events is null.
 */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type LongDate = {
  day: string;
  month: string;
  year: string;
};

/**
 * "1969-07-20" -> { day: "20", month: "July", year: "1969" }. Parsed by
 * string splitting, not `new Date(...)`, deliberately -- a Date-based
 * parse plus a local-timezone format can shift the displayed day, the
 * exact silent-misparse category lib/ephemeris/adapter.ts's own
 * round-trip validation exists to avoid.
 */
export function formatLongDate(isoDate: string): LongDate {
  const [year, month, day] = isoDate.split("-");
  return {
    day: String(Number(day)),
    month: MONTH_NAMES[Number(month) - 1],
    year,
  };
}

// R2: read from the stored payload's matchedYear, not inferred. null when
// there's no events payload at all -- the header status is omitted in
// that case, and eventsLabel(null)'s sentence carries the null case in
// the body instead.
export function eventsStatusLabel(events: WikipediaEventsPayload | null): string | null {
  if (!events) {
    return null;
  }
  return events.matchedYear ? "this exact date" : "on this day, other years";
}
