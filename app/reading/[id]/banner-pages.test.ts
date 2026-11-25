import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TAGLINES } from "@/lib/banner/taglines";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { EMPTY_LOOKUP, PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import ReadingUnavailable from "./error";
import { NAVIGATION_RPCS, ok, renderDatePage, renderReadingPage, useAnon } from "./page-test-support";

// Sprint 43, R2/R8: the banner on every render path of both routes, through
// the real page components, rendered on the server with no client
// JavaScript -- the same harness as accuracy-pages.test.ts.

vi.mock("@/lib/supabase/anon-client", () => ({ createAnonClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("admin client created during a render");
  }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const READING_ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";

const matched = (requestedDate: string) => ({
  source: "wikipedia-onthisday",
  requestedDate,
  matchedYear: true,
  fetchedAt: "2026-01-01T00:00:00.000Z",
  events: [{ year: Number(requestedDate.slice(0, 4)), text: "Something happened" }],
});

const storedRow = (eventDate: string, events: unknown, horoscope: string | null) => ({
  id: READING_ID,
  event_date: eventDate,
  positions: computePositions(calculationInstantForDate(eventDate)),
  events,
  horoscope,
});

beforeEach(() => {
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  // Wikipedia is down for every date-page case: the chart still renders.
  vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The banner is the card's first child, before the date band. */
function expectBannerOpensTheCard(html: string) {
  const card = html.slice(html.indexOf("<main"));
  expect(card).toMatch(/^<main[^>]*><header/);
  expect(card.indexOf("<header")).toBeLessThan(card.indexOf("The sky over"));
  expect(html.match(/<header/g)).toHaveLength(1);
}

/** The banner's tagline, which must be exactly one of the 19. */
function taglineOf(html: string): string | undefined {
  const banner = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  return TAGLINES.find((t) => banner.includes(`>${t}</p>`));
}

const RENDER_PATHS: [string, () => Promise<string>][] = [
  [
    "/date: no saved horoscope (the write form)",
    async () => {
      useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });
      return renderDatePage("1932-01-15");
    },
  ],
  [
    "/date: saved horoscopes unavailable (paused database)",
    async () => {
      useAnon({ get_reading_by_date: PAUSED_LOOKUP, ...NAVIGATION_RPCS });
      return renderDatePage("1932-02-16");
    },
  ],
  [
    "/date: generation disabled",
    async () => {
      vi.stubEnv("HOROSCOPE_ENABLED", "false");
      useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });
      return renderDatePage("1932-03-17");
    },
  ],
  [
    "/reading: a written reading",
    async () => {
      useAnon({ get_reading_by_id: ok([storedRow("1969-07-20", matched("1969-07-20"), "Saturn keeps the ledger.")]) });
      return renderReadingPage(READING_ID);
    },
  ],
  [
    "/reading: an unwritten reading",
    async () => {
      useAnon({ get_reading_by_id: ok([storedRow("1969-07-21", matched("1969-07-21"), null)]) });
      return renderReadingPage(READING_ID);
    },
  ],
  [
    "/reading: events unavailable (Sprint 39's message)",
    async () => {
      useAnon({ get_reading_by_id: ok([storedRow("1985-03-06", null, null)]) });
      return renderReadingPage(READING_ID);
    },
  ],
];

describe("the banner on every render path (Sprint 43, R2)", () => {
  it.each(RENDER_PATHS)("%s: opens the card, with one of the 19 taglines", async (_, renderPage) => {
    const html = await renderPage();

    expectBannerOpensTheCard(html);
    expect(taglineOf(html)).toBeDefined();
  });

  it("/reading's error boundary: the banner opens its card, with no tagline", () => {
    const html = renderToStaticMarkup(createElement(ReadingUnavailable));

    expect(html).toMatch(/<main[^>]*><header/);
    expect(taglineOf(html)).toBeUndefined();
    expect(html).toContain("This reading can\u2019t be shown right now.");
  });
});

describe("the error card's padding (Sprint 43, R2)", () => {
  it("is on the card's contents, never the card, at either width, so the banner spans the card", () => {
    const css = readFileSync(join(__dirname, "unavailable.module.css"), "utf8");
    const cardRules = [...css.matchAll(/\.card \{([^}]*)\}/g)].map((m) => m[1]);

    expect(cardRules.length).toBeGreaterThan(0);
    for (const rule of cardRules) expect(rule).not.toMatch(/padding/);
    expect(css).toMatch(/\.cardBody \{\s*padding: 40px 44px;/);
    expect(css).toMatch(/@media \(max-width: 900px\) \{[^@]*\.cardBody \{\s*padding: 28px 24px;/);
  });
});

describe("the tagline is picked on the server, per request (Sprint 43, R8)", () => {
  it("each page's pick comes from Math.random on the server: 0 gives the first, just under 1 the last", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(taglineOf(await renderDatePage("1932-04-18"))).toBe(TAGLINES[0]);

    vi.spyOn(Math, "random").mockReturnValue(1 - Number.EPSILON);
    useAnon({ get_reading_by_id: ok([storedRow("1969-07-20", matched("1969-07-20"), null)]) });
    expect(taglineOf(await renderReadingPage(READING_ID))).toBe(TAGLINES[TAGLINES.length - 1]);
  });

  it("two requests can show different taglines", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValue(0.9);
    const first = taglineOf(await renderDatePage("1932-05-19"));
    const second = taglineOf(await renderDatePage("1932-05-19"));

    expect(first).toBe(TAGLINES[1]);
    expect(second).toBe(TAGLINES[17]);
  });
});
