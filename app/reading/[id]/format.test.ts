import { describe, expect, it } from "vitest";
import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";
import { eventsStatusLabel, formatLongDate } from "./format";

function events(overrides: Partial<WikipediaEventsPayload> = {}): WikipediaEventsPayload {
  return {
    source: "wikipedia-onthisday",
    requestedDate: "1969-07-20",
    matchedYear: false,
    fetchedAt: "2026-08-23T00:00:00Z",
    events: [],
    ...overrides,
  };
}

describe("formatLongDate", () => {
  it("formats a two-digit day without a leading zero", () => {
    expect(formatLongDate("1969-07-20")).toEqual({ day: "20", month: "July", year: "1969" });
  });

  it("strips the leading zero from a single-digit day", () => {
    expect(formatLongDate("2026-01-05")).toEqual({ day: "5", month: "January", year: "2026" });
  });

  it("maps every month number to its full name", () => {
    expect(formatLongDate("2026-12-01").month).toBe("December");
    expect(formatLongDate("2026-01-01").month).toBe("January");
  });

  it("never shifts the date via timezone-sensitive parsing", () => {
    // A Date-based parse in a UTC-negative local timezone would show the
    // 19th here if it round-tripped through a Date object's local getters.
    expect(formatLongDate("1969-07-20")).toEqual({ day: "20", month: "July", year: "1969" });
  });
});

describe("eventsStatusLabel (R2)", () => {
  it("is null when there is no events payload", () => {
    expect(eventsStatusLabel(null)).toBeNull();
  });

  it("says the exact date when matchedYear is true", () => {
    expect(eventsStatusLabel(events({ matchedYear: true }))).toBe("this exact date");
  });

  it("says other years when matchedYear is false", () => {
    expect(eventsStatusLabel(events({ matchedYear: false }))).toBe("on this day, other years");
  });
});
