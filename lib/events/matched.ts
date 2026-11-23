import type { WikipediaEventsPayload } from "./wikipedia";

/**
 * Sprint 39 (docs/decisions.md, 23 Nov 2026): a horoscope pairs one date's
 * sky with that date's own events, so one may only be written from, or
 * shown beside, events from the exact year. This is the one statement of
 * that rule in the app. Every write path (the date page's cast, the
 * /reading/[id] generate) and every place a saved horoscope is shown reads
 * it from here.
 */

/** An events payload whose events all come from the requested year. */
export type MatchedEventsPayload = WikipediaEventsPayload & { matchedYear: true };

/**
 * True only for the JSON boolean `true`, the same strictness as Sprint 30's
 * navigation predicate (`events -> 'matchedYear' = 'true'::jsonb`). A stored
 * row is JSON from the database, so a missing key, `null` or the string
 * "true" must not count as matched, whatever the static type says.
 */
export function hasMatchedEvents(
  events: WikipediaEventsPayload | null | undefined
): events is MatchedEventsPayload {
  return events != null && events.matchedYear === true;
}

/** Requirement 3/4's lead sentence: the events exist but are from other years. */
export const UNMATCHED_EVENTS_REASON =
  "We have no recorded events for this exact date, so we can't write an accurate horoscope for it.";

/** Requirement 5's lead sentence: the Wikipedia lookup itself failed. */
export const EVENTS_LOOKUP_FAILED_REASON =
  "The events for this date couldn't be loaded, so the horoscope can't be written right now.";

/**
 * Why a horoscope can't be written from these events, or null when it can.
 * The server-side refusals return this as their failure message.
 */
export function unwritableReason(events: WikipediaEventsPayload | null | undefined): string | null {
  if (events == null) return EVENTS_LOOKUP_FAILED_REASON;
  return hasMatchedEvents(events) ? null : UNMATCHED_EVENTS_REASON;
}
