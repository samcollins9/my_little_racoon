import { describe, expect, it } from "vitest";
import type { WikipediaEventsPayload } from "../events/wikipedia";
import { horoscopeAvailability, linkableEventDate, unavailableMessage } from "./accuracy";

// Sprint 39, R11: the linkable-year rule and the message choice.

const R3_TEXT =
  "We have no recorded events for this exact date, so we can't write an accurate horoscope for it. " +
  'Pick a different date, or choose one of the years listed under "What happened" to go to that date instead.';
const R4_TEXT =
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
    expect(horoscopeAvailability(events(true, [2031]), "2031-05-09")).toEqual({ kind: "writable" });
  });

  it("R3: unmatched with at least one linkable year", () => {
    const availability = horoscopeAvailability(events(false, [1500, 1976]), "2031-05-09");
    expect(availability).toEqual({ kind: "unmatched", hasLinkableYear: true });
    expect(text(availability)).toBe(R3_TEXT);
  });

  it("R4: unmatched with zero events", () => {
    const availability = horoscopeAvailability(events(false, []), "2031-05-09");
    expect(availability).toEqual({ kind: "unmatched", hasLinkableYear: false });
    expect(text(availability)).toBe(R4_TEXT);
  });

  it("R4: unmatched, every event before 1700", () => {
    const availability = horoscopeAvailability(events(false, [1066, 1415, 1699]), "2031-05-09");
    expect(availability).toEqual({ kind: "unmatched", hasLinkableYear: false });
    expect(text(availability)).toBe(R4_TEXT);
  });

  it("R4: unmatched on 29 February where no event year is a leap year in range", () => {
    const availability = horoscopeAvailability(events(false, [1900, 1901, 1600]), "2024-02-29");
    expect(availability).toEqual({ kind: "unmatched", hasLinkableYear: false });
  });

  it("R5: a failed lookup (null)", () => {
    const availability = horoscopeAvailability(null, "2031-05-09");
    expect(availability).toEqual({ kind: "lookupFailed" });
    expect(text(availability)).toBe(R5_TEXT);
  });
});
