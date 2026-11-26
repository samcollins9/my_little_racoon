// Relative, not "@/" -- vitest doesn't resolve the tsconfig alias for
// testable files under app/ (same reason constellation.ts uses relative
// imports, Sprint 13).
import { hasMatchedEvents } from "../../../lib/events/matched";
import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";
import { formatLongDate } from "./format";

/**
 * Pure display-decision helpers, kept out of page.tsx so R4/R2's null and
 * matchedYear handling is directly unit-testable -- page.tsx itself is an
 * async Server Component, not something this codebase's test suite
 * exercises directly (see lib/chart/model.ts and lib/llm/generate.ts for
 * the same testable-core/thin-boundary split).
 */

// R2: read from the stored payload, never inferred from whether the
// requested year happens to match something in the caller's own head.
// Sprint 39, R2: this label is only shown when the event list is empty, and
// an unmatched payload with no events has nothing "across history" to show.
export function eventsLabel(events: WikipediaEventsPayload | null): string {
  if (!events) {
    return "No events looked up for this reading.";
  }
  return hasMatchedEvents(events)
    ? "These events happened on this exact date."
    : "No recorded events for this day.";
}

/**
 * Sprint 48, R1: where "What happened" goes relative to "The reading" --
 * the one rule for it. Only a real list of other years' events goes
 * below: the visitor came for this date, so its own events (or the news
 * that it has none) come first, and other years' events wait until after
 * the reading. A matched payload, an unmatched payload with no events, and
 * a null payload (lookup failed, or nothing looked up) all stay above.
 *
 * Built on hasMatchedEvents, the rule the status label ("on this day,
 * other years") and Sprint 39's messages already share, so the three can
 * never disagree.
 */
export type EventsPlacement = "above" | "below";

export function eventsPlacement(events: WikipediaEventsPayload | null): EventsPlacement {
  return events !== null && !hasMatchedEvents(events) && events.events.length > 0 ? "below" : "above";
}

/** The events section's heading everywhere but Sprint 54's other-years case. */
export const EVENTS_HEADING = "What happened";

/**
 * Sprint 54, R1: the events section's heading -- the one rule for it. In
 * exactly eventsPlacement's "below" case (other years' events listed, none
 * from this exact date) it names what is listed. Sprint 55, R1: month first,
 * "Other years with events on July 4", the page's own month and day (no
 * leading zero) from formatLongDate. Every other case -- this exact date,
 * an empty list, a failed lookup -- keeps "What happened" (the user's
 * decision, 26 Nov 2026).
 */
export function eventsHeading(events: WikipediaEventsPayload | null, eventDate: string): string {
  if (eventsPlacement(events) !== "below") return EVENTS_HEADING;
  const { day, month } = formatLongDate(eventDate);
  return `Other years with events on ${month} ${day}`;
}

/**
 * R9: paragraphs, not raw HTML. Splitting on newlines and letting the
 * caller map each string to a <p> via JSX text content is what keeps this
 * safe -- React escapes text content by default, so nothing here needs to
 * sanitise anything itself. horoscope is untrusted (anon-writable via
 * set_reading_horoscope, Sprint 17 R3/R4), so this must never be handed to
 * dangerouslySetInnerHTML or a markdown renderer with raw HTML enabled.
 */
export function horoscopeParagraphs(horoscope: string | null): string[] {
  if (!horoscope) {
    return [];
  }
  return horoscope
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * A DateEvent's sourceUrl comes from Wikipedia, not from the anon-writable
 * horoscope column, but it's still externally-sourced text ending up in an
 * href. Requiring https:// is a cheap guard against a malformed or
 * unexpected scheme (javascript:, data:) ever being rendered as a link,
 * on a page already being careful about untrusted content (R9).
 */
export function isSafeExternalUrl(url: string | undefined): url is string {
  return typeof url === "string" && url.startsWith("https://");
}
