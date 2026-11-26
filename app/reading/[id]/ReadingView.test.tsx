import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculationInstantForDate, computePositions } from "../../../lib/ephemeris/adapter";
import { ZODIAC_SIGNS } from "../../../lib/ephemeris/zodiac";
import { planetTooltip, sectorTooltip } from "./constellation";
import type { WikipediaEventsPayload } from "../../../lib/events/wikipedia";
import { TAGLINES } from "../../../lib/banner/taglines";
import { HoroscopeUnavailableSection, ReadingView } from "./ReadingView";

// Sprint 34, R1/R2/R4: the desktop chart's native tooltips, read from the
// rendered markup the way a browser receives it. 1969-07-20 has real
// positions; the retrograde case is forced below so it doesn't depend on
// which planets happened to be retrograde that day.
//
// JSX rather than createElement, unlike the rest of the suite's .ts tests:
// ReadingView's `children` is a required prop, and createElement can only
// satisfy that type by passing children as a prop, which
// react/no-children-prop forbids. JSX passes them as children, as the page
// does.

const DATE = "1969-07-20";

function renderView(positions = computePositions(calculationInstantForDate(DATE))): string {
  // The reading section's contents aren't needed for the chart.
  return renderToStaticMarkup(
    <ReadingView eventDate={DATE} positions={positions} events={null} tagline={TAGLINES[0]}>
      {null}
    </ReadingView>
  );
}

/** The desktop SVG only (the first of the two; the mobile one is the cropped viewBox). */
function desktopSvg(html: string): string {
  const match = html.match(/<svg viewBox="0 0 640 640"[\s\S]*?<\/svg>/);
  if (!match) throw new Error("desktop chart not found");
  return match[0];
}

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("desktop chart tooltips (Sprint 34)", () => {
  const positions = computePositions(calculationInstantForDate(DATE));
  const svg = desktopSvg(renderView(positions));

  it("R1: every planet group's first child is a <title> with the helper's text", () => {
    for (const position of positions) {
      expect(svg).toContain(`<g><title>${escapeXml(planetTooltip(position))}</title><circle`);
    }
  });

  it("R1: a retrograde planet's title carries the suffix", () => {
    const forced = positions.map((p) => (p.body === "Mars" ? { ...p, retrograde: true } : p));
    const mars = forced.find((p) => p.body === "Mars")!;

    expect(desktopSvg(renderView(forced))).toContain(`<title>${planetTooltip(mars)}</title>`);
    expect(planetTooltip(mars)).toMatch(/, retrograde$/);
  });

  it("R2: every sector glyph's first child is a <title> with the helper's text", () => {
    for (const sign of ZODIAC_SIGNS) {
      expect(svg).toMatch(new RegExp(`<text [^>]*><title>${sectorTooltip(sign)}</title>[♈-♓]</text>`));
    }
  });

  it("exactly 10 planet titles and 12 sector titles, and none hoisted out of the SVG", () => {
    const html = renderView(positions);
    const allTitles = html.match(/<title>/g) ?? [];

    expect(svg.match(/<title>/g)).toHaveLength(positions.length + ZODIAC_SIGNS.length);
    expect(allTitles).toHaveLength(positions.length + ZODIAC_SIGNS.length);
  });

  it("the centre date and hour labels, drawn above the planets, never take the pointer from them", () => {
    // LiveQA round 1: on 1969-07-20 the Moon's glyph sits inside the centre
    // date label, which is drawn after the planets and so took the hover.
    const centreLabels = [...svg.matchAll(/<text x="320" y="(316|338)"[^>]*>/g)].map((m) => m[0]);
    expect(centreLabels).toHaveLength(2);
    for (const label of centreLabels) expect(label).toContain('pointer-events="none"');

    // They are the only elements after the last planet group.
    const afterPlanets = svg.slice(svg.lastIndexOf("</g>") + "</g>".length);
    expect(afterPlanets.match(/<(?!\/)[a-z]+/g)).toEqual(["<text", "<text"]);
  });

  it("the phone chart is unchanged: no tooltips there (optional, not added)", () => {
    const html = renderView(positions);
    const mobile = html.match(/<svg viewBox="110 110 420 420"[\s\S]*?<\/svg>/)![0];

    expect(mobile).not.toContain("<title>");
  });
});

// Sprint 42, R2: the "What happened" column shows event text through
// stripPictureNotes. Rendered on the server, the way /date/[date] and
// /reading/[id] (which share this component) first reach a visitor.
describe('"What happened" drops Wikipedia\'s picture notes (Sprint 42)', () => {
  const events: WikipediaEventsPayload = {
    source: "wikipedia-onthisday",
    requestedDate: DATE,
    matchedYear: true,
    fetchedAt: "2026-11-24T00:00:00.000Z",
    events: [
      {
        year: 1969,
        text: "Apollo 11 (pictured) lands on the Moon, and Armstrong (signing pictured), steps out.",
        sourceUrl: "https://en.wikipedia.org/wiki/Apollo_11",
      },
      { year: 1969, text: "A painting (depicted) is shown." },
    ],
  };

  const html = renderToStaticMarkup(
    <ReadingView
      eventDate={DATE}
      positions={computePositions(calculationInstantForDate(DATE))}
      events={events}
      tagline={TAGLINES[0]}
    >
      {null}
    </ReadingView>
  );

  it("removes the note and leaves the sentence tidy", () => {
    expect(html).not.toMatch(/pictured/i);
    expect(html).toContain("Apollo 11 lands on the Moon, and Armstrong, steps out.");
  });

  it("keeps the source link, untouched", () => {
    expect(html).toContain(
      'Apollo 11 lands on the Moon, and Armstrong, steps out. (<a href="https://en.wikipedia.org/wiki/Apollo_11">source</a>)'
    );
  });

  it('leaves text without a note alone, "(depicted)" included', () => {
    expect(html).toContain("A painting (depicted) is shown.");
  });
});

describe("Sprint 39's message in The reading (Sprint 54, R2/R4)", () => {
  const unhash = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");
  const render = (availability: Parameters<typeof HoroscopeUnavailableSection>[0]["availability"]) =>
    unhash(
      renderToStaticMarkup(
        <HoroscopeUnavailableSection availability={availability} eventsHeading="Other years with 4 July events" />
      )
    );
  const paragraphs = (html: string) => html.match(/<p[ >][\s\S]*?<\/p>/g) ?? [];

  it("one paragraph: the bold lead, one line break, then the next step quoting the heading it's given", () => {
    const html = render({ kind: "unmatched", hasLinkableYear: true });
    expect(paragraphs(html)).toEqual([
      '<p class="accuracyNote"><strong class="accuracyLead">We have no recorded events for this exact date, so we can&#x27;t write an accurate horoscope for it.</strong><br/>' +
        "Pick a different date, or choose one of the years listed under &quot;Other years with 4 July events&quot; to go to that date instead.</p>",
    ]);
  });

  it.each([
    ["unmatched, no linkable year", { kind: "unmatched" as const, hasLinkableYear: false }, "Pick a different date."],
    ["lookup failed", { kind: "lookupFailed" as const }, "Try again in a few minutes."],
  ])("%s: the same structure, one <br/> and no stray characters", (_, availability, next) => {
    const found = paragraphs(render(availability));
    expect(found).toHaveLength(1);
    const p = found[0] ?? "";
    expect(p).toMatch(new RegExp(`^<p class="accuracyNote"><strong class="accuracyLead">[^<]+</strong><br/>${next.replace(/\./g, "\\.")}</p>$`));
    expect(p.match(/<br\/>/g)).toHaveLength(1);
  });
});
