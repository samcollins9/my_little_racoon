import type { WikipediaEventsPayload } from "../events/wikipedia";
import {
  EVENTS_LOOKUP_FAILED_REASON,
  UNMATCHED_EVENTS_REASON,
  hasMatchedEvents,
} from "../events/matched";
import { parseDatePageParam } from "./params";

/**
 * Sprint 39: what the reading section may offer for a date, decided from the
 * events shown beside it. Pure, so both routes (the date page and
 * /reading/[id]) and the tests share one decision.
 */

/**
 * Requirement 1's linkable year: the date `year`-MM-DD, taking MM-DD from
 * `isoDate`, when the date page accepts it, or null.
 *
 * The year is padded to four digits, so 999 becomes "0999", and then
 * judged by parseDatePageParam, the page's own validator. That rejects
 * years outside the supported range and 29 February in a non-leap year
 * without restating either rule. A year that can't be written as four
 * digits (negative, which Wikipedia uses for BC, or above 9999) is never a
 * date-page path, so it's turned away before padding would garble it.
 */
export function linkableEventDate(year: number, isoDate: string): string | null {
  if (!Number.isInteger(year) || year < 0 || year > 9999) return null;
  const monthDay = isoDate.slice(4); // "-MM-DD"
  return parseDatePageParam(`${String(year).padStart(4, "0")}${monthDay}`);
}

export type HoroscopeAvailability =
  | { kind: "writable" }
  /** Requirement 3 (`hasLinkableYear`) or Requirement 4 (not). */
  | { kind: "unmatched"; hasLinkableYear: boolean }
  /** Requirement 5. */
  | { kind: "lookupFailed" };

export type UnavailableHoroscope = Exclude<HoroscopeAvailability, { kind: "writable" }>;

/**
 * `isoDate` is the date the events belong to: the page's own date, or the
 * stored row's event_date on /reading/[id].
 */
export function horoscopeAvailability(
  events: WikipediaEventsPayload | null,
  isoDate: string
): HoroscopeAvailability {
  if (events == null) return { kind: "lookupFailed" };
  if (hasMatchedEvents(events)) return { kind: "writable" };
  return {
    kind: "unmatched",
    hasLinkableYear: events.events.some((event) => linkableEventDate(event.year, isoDate) !== null),
  };
}

/** The message's two parts: the bold lead sentence, then what to do next. */
export type UnavailableMessage = { lead: string; next: string };

export function unavailableMessage(availability: UnavailableHoroscope): UnavailableMessage {
  switch (availability.kind) {
    case "lookupFailed":
      return { lead: EVENTS_LOOKUP_FAILED_REASON, next: "Try again in a few minutes." };
    case "unmatched":
      return {
        lead: UNMATCHED_EVENTS_REASON,
        next: availability.hasLinkableYear
          ? 'Pick a different date, or choose one of the years listed under "What happened" to go to that date instead.'
          : "Pick a different date.",
      };
  }
}
