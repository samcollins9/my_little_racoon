import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { dayNavigation } from "@/lib/date-page/navigation";
import { DateNavigation } from "./DateNavigation";
import { DatePicker } from "./DatePicker";

// Sprint 47, R5/R6: the day links and the picker row, read from the
// rendered markup. NOW fixes "today" at 2026-11-25 (UTC).

const NOW = new Date("2026-11-25T14:00:00.000Z");
const TODAY = "2026-11-25";

const unhashClasses = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");

const renderDays = (isoDate: string) =>
  unhashClasses(
    renderToStaticMarkup(<DateNavigation navigation={dayNavigation(isoDate, NOW)} isoDate={isoDate} />)
  );

/** The day links' <nav>, without the notable dates that follow it. */
const daysNav = (html: string) => html.match(/<nav class="adjacent"[\s\S]*?<\/nav>/)?.[0] ?? "";

const links = (html: string) => [...html.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);

describe("Previous day / Next day (R5)", () => {
  it("an ordinary date: both links, labelled, each with its long-format date", () => {
    const nav = daysNav(renderDays("1969-07-20"));
    expect(nav).toContain('aria-label="Previous and next day"');
    const [previous, next] = links(nav);
    expect(previous).toContain('href="/date/1969-07-19"');
    expect(previous).toContain('rel="prev"');
    expect(previous).toContain("← Previous day</span>");
    expect(previous).toContain(">19 July 1969</span>");
    expect(next).toContain('href="/date/1969-07-21"');
    expect(next).toContain('rel="next"');
    expect(next).toContain("Next day →</span>");
    expect(next).toContain(">21 July 1969</span>");
  });

  it("today's page: no Next link; a disabled, unfocusable element with the visible message", () => {
    const nav = daysNav(renderDays(TODAY));
    expect(links(nav)).toHaveLength(1);
    expect(nav).not.toContain('href="/date/2026-11-26"');
    expect(nav).not.toContain('rel="next"');
    expect(nav).toContain(
      '<span class="adjacentLink adjacentNext adjacentDisabled" role="link" aria-disabled="true">' +
        '<span class="adjacentLabel">Next day →</span>' +
        '<span class="adjacentNote">Reloy predicts only the past.</span></span>'
    );
    expect(nav).not.toContain("tabindex");
  });

  it("1700-01-01: no Previous link", () => {
    const nav = daysNav(renderDays("1700-01-01"));
    expect(nav).not.toContain("Previous day");
    expect(links(nav)).toHaveLength(1);
    expect(nav).toContain('href="/date/1700-01-02"');
  });
});

describe("the picker row (R3/R6)", () => {
  const renderPicker = (randomDate: string | null) =>
    unhashClasses(renderToStaticMarkup(<DatePicker isoDate="1969-07-20" today={TODAY} randomDate={randomDate} />));

  it("R3: max is the given today, min the engine's first date", () => {
    const html = renderPicker(null);
    expect(html).toMatch(/<input [^>]*max="2026-11-25"/);
    expect(html).toMatch(/<input [^>]*min="1700-01-01"/);
  });

  it("R6: Go, then 'or', then the random link, which wears Go's own class", () => {
    const html = renderPicker("1912-04-15");
    expect(html).toContain(
      '<button type="submit" class="pickerButton">Go</button>' +
        '<span class="pickerOr">or</span>' +
        '<a class="pickerButton pickerLink" href="/date/1912-04-15">Discover random reading</a>'
    );
  });

  it("R6: with no date, neither the link nor its 'or'", () => {
    const html = renderPicker(null);
    expect(html).not.toContain("Discover random reading");
    expect(html).not.toContain("pickerOr");
    expect(html).toContain('<button type="submit" class="pickerButton">Go</button></div>');
  });
});
