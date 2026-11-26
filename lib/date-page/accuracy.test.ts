import { describe, expect, it } from "vitest";
import type { WikipediaEventsPayload } from "../events/wikipedia";
import { horoscopeAvailability, linkableEventDate, unavailableMessage } from "./accuracy";

// Sprint 39, R11: the linkable-year rule and the message choice.

// Sprint 55, R2: one unmatched message, whether or not a listed year links.
const UNMATCHED_TEXT =
  "We have no recorded events for this exact date, so we can't write an accurate horoscope for it. " +
  "Pick a different date.";
const R5_TEXT =
  "The events for this date couldn't be loaded, so the horoscope can't be written right now. " +
  "Try again in a few minutes.";

function events(matchedYear: boolean, years: number[]): WikipediaEventsPayload {
  return {
    source: "wikipedia-onthisday",
    requestedDate: "2031-05-09",
    matchedYear,
    fetchedAt: "2026-11-23T00:00:00.000Z",
    events: years.map((year) => ({ year, text: `An event in ${year}` })),
  };
}

describe("linkableEventDate (R1)", () => {
  it("keeps the page's month and day with the event's year", () => {
    expect(linkableEventDate(1976, "2031-05-09")).toBe("1976-05-09");
  });

  it("accepts both ends of the supported range", () => {
    expect(linkableEventDate(1700, "2031-01-01")).toBe("1700-01-01");
    expect(linkableEventDate(2100, "2031-12-31")).toBe("2100-12-31");
  });

  it("a year before 1700 isn't linkable", () => {
    expect(linkableEventDate(1699, "2031-05-09")).toBeNull();
  });

  it("a year after 2100 isn't linkable", () => {
    expect(linkableEventDate(2101, "2031-05-09")).toBeNull();
  });

  it("29 February only in a leap year", () => {
    expect(linkableEventDate(1900, "2024-02-29")).toBeNull(); // a century, not a leap year
    expect(linkableEventDate(1901, "2024-02-29")).toBeNull();
    expect(linkableEventDate(1904, "2024-02-29")).toBe("1904-02-29");
    expect(linkableEventDate(2000, "2024-02-29")).toBe("2000-02-29");
  });

  it("years under 1000 are padded to four digits, then judged by the range (so not linkable today)", () => {
    // Padding happens: a short year never produces a malformed path. The
    // supported range then turns it away, as it does any year before 1700.
    expect(linkableEventDate(999, "2031-05-09")).toBeNull();
    expect(linkableEventDate(44, "2031-03-15")).toBeNull();
    expect(linkableEventDate(5, "2031-05-09")).toBeNull();
  });

  it("negative (BC) and non-integer years aren't linkable", () => {
    expect(linkableEventDate(-44, "2031-03-15")).toBeNull();
    expect(linkableEventDate(1976.5, "2031-05-09")).toBeNull();
    expect(linkableEventDate(Number.NaN, "2031-05-09")).toBeNull();
  });
});

describe("horoscopeAvailability and the message for each case (R3-R5)", () => {
  const text = (availability: ReturnType<typeof horoscopeAvailability>) => {
    if (availability.kind === "writable") throw new Error("expected a message");
    const { lead, next } = unavailableMessage(availability);
    return `${lead} ${next}`;
  };

  it("matched events: writable, no message", () => {
    expect(horoscopeAvailability(events(true, [2031]))).toEqual({ kind: "writable" });
  });

  // Sprint 55, R2: the year list's links no longer change the message.
  it.each([
    ["at least one linkable year", [1500, 1976]],
    ["zero events", []],
    ["every event before 1700", [1066, 1415, 1699]],
  ])("unmatched, %s: 'Pick a different date.'", (_, years) => {
    const availability = horoscopeAvailability(events(false, years));
    expect(availability).toEqual({ kind: "unmatched" });
    expect(text(availability)).toBe(UNMATCHED_TEXT);
  });

  it("Sprint 55, R2: the next step is exactly 'Pick a different date.' with and without linkable years", () => {
    const linkable = events(false, [1976]);
    const none = events(false, [1066]);
    // The premise: one payload has a linkable year for 4 July, the other doesn't.
    expect(linkable.events.some((event) => linkableEventDate(event.year, "2031-07-04") !== null)).toBe(true);
    expect(none.events.some((event) => linkableEventDate(event.year, "2031-07-04") !== null)).toBe(false);
    for (const payload of [linkable, none]) {
      const availability = horoscopeAvailability(payload);
      if (availability.kind === "writable") throw new Error("expected a message");
      expect(unavailableMessage(availability).next).toBe("Pick a different date.");
    }
  });

  it("R5: a failed lookup (null)", () => {
    expect(horoscopeAvailability(null)).toEqual({ kind: "lookupFailed" });
    expect(text(horoscopeAvailability(null))).toBe(R5_TEXT);
  });
});
