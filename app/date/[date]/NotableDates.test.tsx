import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NOTABLE_DATES } from "@/lib/date-page/notable-dates";
import type { DayNavigation } from "@/lib/date-page/navigation";
import { DateNavigation } from "./DateNavigation";
import { NotableDatesSection } from "./NotableDates";

// Sprint 45: "Other notable dates", read from the rendered markup the way a
// browser receives it. The strip (DateNavigation) holds Previous/Next day
// (Sprint 47, covered in DateNavigation.test.tsx) and the desktop copy;
// NotableDatesSection is the phone copy. Where each sits
// on the page, and that it survives the lookup failing, is covered through
// the real page in notable-dates-page.test.ts.

const NOT_LISTED = "2012-11-11";
const APOLLO = "1969-07-20";
const DAYS: DayNavigation = { previous: "2012-11-10", next: { kind: "link", date: "2012-11-12" } };

/** React's text escaping, for comparing descriptions against markup. */
const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Vitest hashes CSS-module class names ("_notableStrip_774840"); read them unhashed. */
const unhashClasses = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");

function renderStrip(navigation: DayNavigation = DAYS, isoDate = NOT_LISTED): string {
  return unhashClasses(renderToStaticMarkup(<DateNavigation navigation={navigation} isoDate={isoDate} />));
}

function renderSection(isoDate = NOT_LISTED): string {
  return unhashClasses(renderToStaticMarkup(<NotableDatesSection isoDate={isoDate} />));
}

/** Every `/date/...` link target in the markup, in order. */
function dateLinks(html: string): string[] {
  return [...html.matchAll(/<a [^>]*href="\/date\/([^"]+)"/g)].map((m) => m[1]);
}

/** The opening tag of the one link to `isoDate`, whatever its attribute order. */
function anchorTo(html: string, isoDate: string): string {
  const tags = [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0]);
  const matching = tags.filter((tag) => tag.includes(`href="/date/${isoDate}"`));
  if (matching.length !== 1) throw new Error(`expected one link to ${isoDate}, found ${matching.length}`);
  return matching[0];
}

function stripCopy(html: string): string {
  const match = html.match(/<nav [^>]*aria-labelledby="notable-dates-strip-heading"[^>]*>[\s\S]*?<\/nav>/);
  if (!match) throw new Error("desktop notable-dates nav not found");
  return match[0];
}

const ALL_DATES = NOTABLE_DATES.map((d) => d.isoDate);

describe("the strip under the date picker", () => {
  it("R2: all 20 notable links, needing no lookup (the strip takes none)", () => {
    expect(dateLinks(stripCopy(renderStrip()))).toEqual(ALL_DATES);
  });

  it("Previous/Next day come first in the strip, ahead of the list", () => {
    expect(dateLinks(renderStrip())).toEqual(["2012-11-10", "2012-11-12", ...ALL_DATES]);
  });

  it("R8: the old single label is gone", () => {
    expect(renderStrip()).not.toContain("Dates with readings");
  });

  it("R3: the desktop copy is headed 'Other notable dates' and labelled by it", () => {
    const strip = stripCopy(renderStrip());
    expect(strip).toContain('class="notableStrip desktopOnly"');
    expect(strip).toContain('<h2 id="notable-dates-strip-heading" class="navTitle">Other notable dates</h2>');
  });

  it("R3: every link's accessible description is its tooltip, holding R1's text", () => {
    const strip = stripCopy(renderStrip());
    for (const { isoDate, description } of NOTABLE_DATES) {
      const id = `notable-tooltip-${isoDate}`;
      expect(anchorTo(strip, isoDate)).toContain(`aria-describedby="${id}"`);
      expect(strip).toContain(
        `<span id="${id}" role="tooltip" class="notableTooltip">${escapeHtml(description)}</span>`
      );
    }
  });

  it("R4: on a phone the strip shows only Previous/Next day; the desktop copy is desktopOnly", () => {
    // Sprint 47: there's always at least one day link, so the wrapper is
    // never desktop-only any more.
    expect(renderStrip()).toMatch(/^<div class="dateNav">/);
    expect(renderStrip()).not.toContain("<details");
  });

  it("R5: the page's own date is marked, not linked, and keeps its tooltip", () => {
    const strip = stripCopy(renderStrip(DAYS, APOLLO));
    expect(dateLinks(strip)).toEqual(ALL_DATES.filter((d) => d !== APOLLO));
    expect(strip).toContain(
      `<span class="notableCurrent" aria-current="page" aria-describedby="notable-tooltip-${APOLLO}">20 July 1969</span>`
    );
    expect(strip).toContain(
      `<span id="notable-tooltip-${APOLLO}" role="tooltip" class="notableTooltip">Apollo 11 lands on the Moon</span>`
    );
  });
});

describe("the phone copy (R4)", () => {
  it("is phone-only, headed like the page's sections, and not folded", () => {
    const html = renderSection();
    expect(html).toMatch(/^<nav class="notableSection mobileOnly" aria-labelledby="notable-dates-section-heading">/);
    expect(html).toContain(
      '<h2 id="notable-dates-section-heading" class="sectionTitle">Other notable dates</h2>'
    );
    expect(html).not.toContain("<details");
  });

  it("every date has its description as a visible line inside the link, oldest first", () => {
    const html = renderSection();
    expect(dateLinks(html)).toEqual(ALL_DATES);
    for (const { isoDate, description } of NOTABLE_DATES) {
      expect(html).toMatch(
        new RegExp(
          `<a [^>]*href="/date/${isoDate}"[^>]*><span class="notableSectionDate">[^<]+</span>` +
            `<span class="notableSectionDescription">${escapeHtml(description).replace(/[.()]/g, "\\$&")}</span></a>`
        )
      );
    }
  });

  it("R5: the page's own date is marked, not linked, and keeps its description", () => {
    const html = renderSection(APOLLO);
    expect(dateLinks(html)).toEqual(ALL_DATES.filter((d) => d !== APOLLO));
    expect(html).toContain(
      '<span class="notableSectionRow notableSectionCurrent" aria-current="page">' +
        '<span class="notableSectionDate">20 July 1969</span>' +
        '<span class="notableSectionDescription">Apollo 11 lands on the Moon</span></span>'
    );
  });
});
