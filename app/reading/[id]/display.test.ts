import { describe, expect, it } from "vitest";
import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";
import { EVENTS_HEADING, eventsHeading, eventsLabel, eventsPlacement, horoscopeParagraphs, isSafeExternalUrl } from "./display";

function events(overrides: Partial<WikipediaEventsPayload> = {}): WikipediaEventsPayload {
  return {
    source: "wikipedia-onthisday",
    requestedDate: "1977-03-31",
    matchedYear: false,
    fetchedAt: "2026-08-23T00:00:00Z",
    events: [{ year: 1889, text: "Something happened" }],
    ...overrides,
  };
}

describe("eventsLabel (R2, R4)", () => {
  it("says nothing was looked up when events is null", () => {
    expect(eventsLabel(null)).toBe("No events looked up for this reading.");
  });

  it("says the year matched when matchedYear is true", () => {
    expect(eventsLabel(events({ matchedYear: true }))).toBe(
      "These events happened on this exact date."
    );
  });

  // Sprint 39, R2: the label is only shown for an empty list, and an
  // unmatched day with no events has no other-year happenings to show.
  it("an unmatched payload with no events says there are none", () => {
    expect(eventsLabel(events({ matchedYear: false, events: [] }))).toBe("No recorded events for this day.");
  });
});

describe("eventsPlacement (Sprint 48, R1)", () => {
  it("matched (this exact date): above the reading", () => {
    expect(eventsPlacement(events({ matchedYear: true, events: [{ year: 1977, text: "x" }] }))).toBe("above");
  });

  it("unmatched with events (on this day, other years): below the reading", () => {
    expect(eventsPlacement(events({ matchedYear: false }))).toBe("below");
  });

  it("unmatched and empty (no recorded events for this day): above the reading", () => {
    expect(eventsPlacement(events({ matchedYear: false, events: [] }))).toBe("above");
  });

  it("null (lookup failed, or nothing looked up): above the reading", () => {
    expect(eventsPlacement(null)).toBe("above");
  });

  it("a stored row whose matchedYear isn't the boolean true counts as unmatched, as hasMatchedEvents says", () => {
    const loose = events({ matchedYear: "true" as unknown as boolean });
    expect(eventsPlacement(loose)).toBe("below");
  });
});

describe("eventsHeading (Sprint 54, R1; Sprint 55, R1)", () => {
  it("other years' events listed: 'Other years with events on Month D', from the page's date", () => {
    expect(eventsHeading(events({ matchedYear: false }), "2026-07-04")).toBe("Other years with events on July 4");
    expect(eventsHeading(events({ matchedYear: false }), "2026-11-25")).toBe("Other years with events on November 25");
  });

  it("a single-digit day has no leading zero", () => {
    expect(eventsHeading(events({ matchedYear: false }), "1931-03-03")).toBe("Other years with events on March 3");
    expect(eventsHeading(events({ matchedYear: false }), "2026-01-09")).toBe("Other years with events on January 9");
  });

  it("matched (this exact date): What happened", () => {
    expect(eventsHeading(events({ matchedYear: true, events: [{ year: 2026, text: "x" }] }), "2026-07-04")).toBe(
      "What happened"
    );
  });

  it("unmatched with no events (no recorded events for this day): What happened", () => {
    expect(eventsHeading(events({ matchedYear: false, events: [] }), "2026-07-04")).toBe("What happened");
  });

  it("null (lookup failed, or nothing looked up): What happened", () => {
    expect(eventsHeading(null, "2026-07-04")).toBe(EVENTS_HEADING);
    expect(EVENTS_HEADING).toBe("What happened");
  });

  it("is the other-years heading exactly when eventsPlacement says below", () => {
    for (const payload of [
      null,
      events({ matchedYear: true }),
      events({ matchedYear: false }),
      events({ matchedYear: false, events: [] }),
    ]) {
      expect(eventsHeading(payload, "2026-07-04") !== EVENTS_HEADING).toBe(eventsPlacement(payload) === "below");
    }
  });
});

describe("horoscopeParagraphs (R4, R9)", () => {
  it("returns no paragraphs when horoscope is null", () => {
    expect(horoscopeParagraphs(null)).toEqual([]);
  });

  it("returns a single paragraph unchanged", () => {
    expect(horoscopeParagraphs("A single paragraph.")).toEqual(["A single paragraph."]);
  });

  it("splits multiple paragraphs on blank-line breaks", () => {
    expect(horoscopeParagraphs("First paragraph.\n\nSecond paragraph.")).toEqual([
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("also splits on single newlines and drops empty lines", () => {
    expect(horoscopeParagraphs("Line one.\nLine two.\n\n\nLine three.")).toEqual([
      "Line one.",
      "Line two.",
      "Line three.",
    ]);
  });
});

describe("isSafeExternalUrl", () => {
  it("accepts an https URL", () => {
    expect(isSafeExternalUrl("https://en.wikipedia.org/wiki/Something")).toBe(true);
  });

  it("rejects a javascript: scheme", () => {
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects a bare http URL", () => {
    expect(isSafeExternalUrl("http://en.wikipedia.org/wiki/Something")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeExternalUrl(undefined)).toBe(false);
  });
});
