import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { EMPTY_LOOKUP } from "@/lib/date-page/test-support";
import { NAVIGATION_RPCS, ok, renderDatePage, renderReadingPage, useAnon } from "./page-test-support";

// Sprint 51: a "this exact date" list drops the year column; an "other
// years" list keeps it. Read from the server-rendered markup of both pages,
// so "absent" means absent from the DOM (R1), not hidden by CSS.
//
// fetchDayEvents caches Wikipedia's answer per month and day for the life
// of the module, so every date-page case uses its own month and day.

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

type Entry = { year: number; text: string; sourceUrl?: string };

/** CSS-module class names, hashed by vitest, back to their source names. */
const unhashClasses = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");

/** Wikipedia's "selected" list for every month and day, in the feed's own shape. */
function wikipediaAnswers(selected: Entry[]) {
  const raw = selected.map(({ year, text, sourceUrl }) => ({
    year,
    text,
    ...(sourceUrl ? { pages: [{ content_urls: { desktop: { page: sourceUrl } } }] } : {}),
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ selected: raw }), { status: 200 }))
  );
}

const payload = (requestedDate: string, matchedYear: boolean, events: Entry[]) => ({
  source: "wikipedia-onthisday",
  requestedDate,
  matchedYear,
  fetchedAt: "2026-01-01T00:00:00.000Z",
  events,
});

const storedRow = (eventDate: string, events: unknown) => ({
  id: READING_ID,
  event_date: eventDate,
  positions: computePositions(calculationInstantForDate(eventDate)),
  events,
  horoscope: null,
});

type Row = { classes: string; html: string };

/** Every row of "What happened", with its class list and inner markup. */
function eventRows(page: string): Row[] {
  const html = unhashClasses(page);
  return [...html.matchAll(/<div class="(eventRow[^"]*)">([\s\S]*?)<\/div>/g)].map((m) => ({
    classes: m[1],
    html: m[2],
  }));
}

/** A row's description, its markup stripped. */
const description = (row: Row) => row.html.replace(/<[^>]+>/g, "").trim();

/** R1: no year element at all, the single-column variant, the text first. */
function expectSingleColumn(rows: Row[], texts: string[]) {
  expect(rows).toHaveLength(texts.length);
  rows.forEach((row, i) => {
    expect(row.classes).toBe("eventRow eventRowSingle");
    expect(row.html).not.toMatch(/eventYear/);
    expect(row.html).toMatch(/^<span class="eventText">/);
    expect(description(row)).toContain(texts[i]);
  });
}

/** R2: the year column, as Sprint 39 left it. */
function expectYearColumn(rows: Row[], years: { year: number; href: string | null }[]) {
  expect(rows).toHaveLength(years.length);
  rows.forEach((row, i) => {
    const { year, href } = years[i];
    expect(row.classes).toBe("eventRow");
    if (href) {
      expect(row.html).toMatch(
        new RegExp(`^<a class="eventYear eventYearLink" aria-label="Go to [^"]+" href="${href}">${year}</a>`)
      );
    } else {
      expect(row.html).toMatch(new RegExp(`^<span class="eventYear">${year}</span>`));
    }
  });
}

beforeEach(() => {
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/date/[date] (Sprint 51)", () => {
  it("R1: a matched list renders no year element, descriptions in order, with source links and picture notes stripped", async () => {
    wikipediaAnswers([
      { year: 1812, text: "An event from another year" },
      {
        year: 1969,
        text: "Apollo 11 (pictured) lands on the Moon.",
        sourceUrl: "https://en.wikipedia.org/wiki/Apollo_11",
      },
      { year: 1969, text: "Armstrong steps onto the surface." },
    ]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const page = await renderDatePage("1969-07-20");
    const rows = eventRows(page);

    expect(unhashClasses(page)).toContain(">this exact date</span>");
    expectSingleColumn(rows, ["Apollo 11 lands on the Moon.", "Armstrong steps onto the surface."]);
    // R3: Sprint 42's stripping and the source link are unchanged.
    expect(rows[0].html).toContain(
      'Apollo 11 lands on the Moon. (<a href="https://en.wikipedia.org/wiki/Apollo_11">source</a>)'
    );
    expect(page).not.toMatch(/pictured/i);
    // The other year's event isn't on a matched list at all (fetchDayEvents).
    expect(page).not.toContain("An event from another year");
  });

  it("R2: an unmatched list keeps the year column, links where linkable, plain text where not", async () => {
    wikipediaAnswers([
      { year: 1976, text: "Viking 1 lands on Mars." },
      { year: 1152, text: "A year the date page can't show." },
    ]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const page = await renderDatePage("1999-08-21");

    expect(unhashClasses(page)).not.toContain(">this exact date</span>");
    expectYearColumn(eventRows(page), [
      { year: 1976, href: "/date/1976-08-21" },
      { year: 1152, href: null },
    ]);
  });
});

describe("/reading/[id] (Sprint 51)", () => {
  it("R1: stored matched events render the single-column list", async () => {
    useAnon({
      get_reading_by_id: ok([
        storedRow(
          "1969-07-20",
          payload("1969-07-20", true, [
            { year: 1969, text: "First stored event." },
            { year: 1969, text: "Second stored event.", sourceUrl: "https://en.wikipedia.org/wiki/Moon" },
          ])
        ),
      ]),
    });

    const rows = eventRows(await renderReadingPage(READING_ID));

    expectSingleColumn(rows, ["First stored event.", "Second stored event."]);
    expect(rows[1].html).toContain('(<a href="https://en.wikipedia.org/wiki/Moon">source</a>)');
  });

  it("R2: stored unmatched events keep the year column and its links, from the row's own month and day", async () => {
    useAnon({
      get_reading_by_id: ok([
        storedRow(
          "1985-03-05",
          payload("1985-03-05", false, [
            { year: 1933, text: "Linked." },
            { year: 1600, text: "Before the supported range." },
          ])
        ),
      ]),
    });

    expectYearColumn(eventRows(await renderReadingPage(READING_ID)), [
      { year: 1933, href: "/date/1933-03-05" },
      { year: 1600, href: null },
    ]);
  });

  it("R4: matchedYear that isn't the JSON boolean true is not matched (hasMatchedEvents' strictness)", async () => {
    useAnon({
      get_reading_by_id: ok([
        storedRow("1985-03-06", { ...payload("1985-03-06", false, [{ year: 1933, text: "Kept." }]), matchedYear: "true" }),
      ]),
    });

    expectYearColumn(eventRows(await renderReadingPage(READING_ID)), [{ year: 1933, href: "/date/1933-03-06" }]);
  });
});

describe("the single-column variant's CSS (Sprint 51, R3)", () => {
  const css = readFileSync(join(__dirname, "reading.module.css"), "utf8");

  it("changes only the grid columns, and outranks the phone breakpoint's .eventRow", () => {
    const rule = css.match(/\.eventRow\.eventRowSingle \{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1].trim()).toBe("grid-template-columns: 1fr;");
    expect(css.match(/eventRowSingle/g)).toHaveLength(1);
  });
});
