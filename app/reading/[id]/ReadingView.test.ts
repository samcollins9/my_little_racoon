import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculationInstantForDate, computePositions } from "../../../lib/ephemeris/adapter";
import { ZODIAC_SIGNS } from "../../../lib/ephemeris/zodiac";
import { planetTooltip, sectorTooltip } from "./constellation";
import { ReadingView } from "./ReadingView";

// Sprint 34, R1/R2/R4: the desktop chart's native tooltips, read from the
// rendered markup the way a browser receives it. 1969-07-20 has real
// positions; the retrograde case is forced below so it doesn't depend on
// which planets happened to be retrograde that day.

const DATE = "1969-07-20";

function renderView(positions = computePositions(calculationInstantForDate(DATE))): string {
  return renderToStaticMarkup(
    createElement(ReadingView, { eventDate: DATE, positions, events: null, children: null })
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

  it("the phone chart is unchanged: no tooltips there (optional, not added)", () => {
    const html = renderView(positions);
    const mobile = html.match(/<svg viewBox="110 110 420 420"[\s\S]*?<\/svg>/)![0];

    expect(mobile).not.toContain("<title>");
  });
});
