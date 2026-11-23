import { describe, expect, it } from "vitest";
import {
  EVENTS_LOOKUP_FAILED_REASON,
  UNMATCHED_EVENTS_REASON,
  hasMatchedEvents,
  unwritableReason,
} from "./matched";
import type { WikipediaEventsPayload } from "./wikipedia";

const payload = (matchedYear: unknown): WikipediaEventsPayload =>
  ({
    source: "wikipedia-onthisday",
    requestedDate: "1969-07-20",
    matchedYear,
    fetchedAt: "2026-11-23T00:00:00.000Z",
    events: [],
  }) as WikipediaEventsPayload;

describe("hasMatchedEvents (Sprint 39)", () => {
  it("is true only for matchedYear: true", () => {
    expect(hasMatchedEvents(payload(true))).toBe(true);
  });

  it.each([
    ["false", payload(false)],
    ['the string "true"', payload("true")],
    ["null", payload(null)],
    ["a missing key", payload(undefined)],
    ["null events", null],
    ["undefined events", undefined],
  ])("is false for %s", (_name, events) => {
    expect(hasMatchedEvents(events)).toBe(false);
  });
});

describe("unwritableReason (Sprint 39, R8/R9)", () => {
  it("null when the events are from the exact year", () => {
    expect(unwritableReason(payload(true))).toBeNull();
  });

  it("the unmatched reason for other-year events", () => {
    expect(unwritableReason(payload(false))).toBe(UNMATCHED_EVENTS_REASON);
  });

  it("the failed-lookup reason when there are no events at all", () => {
    expect(unwritableReason(null)).toBe(EVENTS_LOOKUP_FAILED_REASON);
  });
});
