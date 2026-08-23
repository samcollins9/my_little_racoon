import { describe, expect, it } from "vitest";
import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";
import { eventsLabel, horoscopeParagraphs, isSafeExternalUrl } from "./display";

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

  it("says plainly when the year did not match (the common case)", () => {
    expect(eventsLabel(events({ matchedYear: false }))).toBe(
      "No recorded event matched this exact year — showing notable happenings on this day across history instead."
    );
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
