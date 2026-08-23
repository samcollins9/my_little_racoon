// Relative, not "@/" -- vitest doesn't resolve the tsconfig alias for
// testable files under app/ (same reason app/chart/constellation.ts uses
// relative imports, Sprint 13).
import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";

/**
 * Pure display-decision helpers, kept out of page.tsx so R4/R2's null and
 * matchedYear handling is directly unit-testable -- page.tsx itself is an
 * async Server Component, not something this codebase's test suite
 * exercises directly (see lib/chart/model.ts and lib/llm/generate.ts for
 * the same testable-core/thin-boundary split).
 */

// R2: read from the stored payload, never inferred from whether the
// requested year happens to match something in the caller's own head.
export function eventsLabel(events: WikipediaEventsPayload | null): string {
  if (!events) {
    return "No events looked up for this reading.";
  }
  return events.matchedYear
    ? "These events happened on this exact date."
    : "No recorded event matched this exact year — showing notable happenings on this day across history instead.";
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
