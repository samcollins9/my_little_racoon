import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingPanel } from "./ReadingPanel";

// Sprint 31, R3: the written state's link. Rendered on the server, the same
// way the page first reaches a visitor, with no form submission pending.
// createElement rather than JSX keeps this a plain .ts test like the rest
// of the suite.

type PanelProps = Parameters<typeof ReadingPanel>[0];

const BASE: Pick<PanelProps, "paragraphs" | "aspectCount" | "errorMessage"> = {
  paragraphs: ["The sky held its breath."],
  aspectCount: 7,
  errorMessage: null,
};

function render(props: PanelProps): string {
  return renderToStaticMarkup(createElement(ReadingPanel, props));
}

function hrefs(html: string): string[] {
  return [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]);
}

// R5's phrases, plus the label R3 retires.
const RETIRED_COPY = [/cast a new chart/i, /cast the chart/i, /save this reading/i, /see the full reading/i, /\bstep\b/i];

describe("ReadingPanel's written-state link (R3)", () => {
  it("/reading/[id]: links to the reading's own date page, on desktop and mobile", () => {
    const html = render({ ...BASE, hasHoroscope: true, datePageHref: "/date/1969-07-20" });

    expect(hrefs(html)).toEqual(["/date/1969-07-20", "/date/1969-07-20"]);
    expect(html).toContain("Go to this date");
  });

  it("/reading/[id]: carries no old-flow copy and no link to /chart", () => {
    const html = render({ ...BASE, hasHoroscope: true, datePageHref: "/date/1969-07-20" });

    expect(html).not.toContain("/chart");
    for (const phrase of RETIRED_COPY) expect(html).not.toMatch(phrase);
  });

  it("the date page (offerNewChart={false}): renders no link at all, as before", () => {
    const html = render({ ...BASE, hasHoroscope: true, offerNewChart: false });

    expect(hrefs(html)).toEqual([]);
    expect(html).not.toContain("Go to this date");
  });

  it("an unwritten reading still offers \"Write the horoscope\" and no link (R3: unchanged)", () => {
    const html = render({ ...BASE, hasHoroscope: false, paragraphs: [], datePageHref: "/date/1969-07-20" });

    expect(html).toContain("Write the horoscope");
    expect(hrefs(html)).toEqual([]);
  });

  it("a failed generation still offers \"Try again\" in place of the link", () => {
    const html = render({
      ...BASE,
      hasHoroscope: true,
      errorMessage: "Couldn't write the horoscope.",
      datePageHref: "/date/1969-07-20",
    });

    expect(html).toContain("Try again");
    expect(hrefs(html)).toEqual([]);
  });
});
