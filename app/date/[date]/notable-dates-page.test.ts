import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTABLE_DATES } from "@/lib/date-page/notable-dates";
import { EMPTY_LOOKUP, PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import { NAVIGATION_RPCS, ok, renderDatePage, useAnon } from "@/app/reading/[id]/page-test-support";

// Sprint 45, R2/R4: "Other notable dates" through the real date page,
// rendered on the server with no client JavaScript -- the same harness as
// accuracy-pages.test.ts. Wikipedia is down for every case (the page still
// renders), so the feed's month-day cache never matters here.

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

const unhashClasses = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");

const ALL_DATES = NOTABLE_DATES.map((d) => d.isoDate);

/** One copy of the list, by the id of the heading that labels it. */
function copy(html: string, headingId: string): string {
  const match = html.match(new RegExp(`<nav [^>]*aria-labelledby="${headingId}"[^>]*>[\\s\\S]*?</nav>`));
  if (!match) throw new Error(`${headingId} not found`);
  return match[0];
}

const dateLinks = (html: string) =>
  [...html.matchAll(/<a [^>]*href="\/date\/([^"]+)"/g)].map((m) => m[1]);

beforeEach(() => {
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the date page's notable dates (Sprint 45)", () => {
  it("R2: with the navigation lookup unavailable, both copies keep all 20 links; only Previous/Next go", async () => {
    const fake = useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_adjacent_reading_dates: PAUSED_LOOKUP });

    const html = unhashClasses(await renderDatePage("2012-11-11"));

    expect(dateLinks(copy(html, "notable-dates-strip-heading"))).toEqual(ALL_DATES);
    expect(dateLinks(copy(html, "notable-dates-section-heading"))).toEqual(ALL_DATES);
    expect(html).not.toContain("Previous reading");
    expect(html).not.toContain("Next reading");
    // R8: a render calls only these two RPCs; any other (the retired
    // recent-dates lookup included) fails here.
    const called = new Set(fake.rpc.mock.calls.map(([name]) => name));
    expect(called).toEqual(new Set(["get_reading_by_date", "get_adjacent_reading_dates"]));
  });

  it("R2/R7: with the lookup available, Previous/Next are in the strip beside the desktop list", async () => {
    useAnon({
      get_reading_by_date: EMPTY_LOOKUP,
      get_adjacent_reading_dates: ok([{ previous_date: "2012-10-01", next_date: "2013-01-05" }]),
    });

    const html = unhashClasses(await renderDatePage("2012-11-11"));
    const strip = html.match(/<div class="flowSlot">[\s\S]*?<\/div><\/div>/)?.[0] ?? "";

    expect(strip).toContain("Previous reading");
    expect(strip).toContain("Next reading");
    expect(strip).toContain('aria-labelledby="notable-dates-strip-heading"');
    expect(strip).not.toContain("notable-dates-section-heading");
  });

  it("R4: the phone copy closes the card, after the reading section and outside it", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = unhashClasses(await renderDatePage("2012-11-11"));
    const section = copy(html, "notable-dates-section-heading");

    // The reading section, the right column and the body all close, then
    // the list is the card's last child.
    expect(html).toContain(`</section></div></div>${section}</main>`);
    expect(section).not.toContain("<details");
  });

  it("R5: on 1969-07-20, that entry is marked and not linked in both copies", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = unhashClasses(await renderDatePage("1969-07-20"));
    const others = ALL_DATES.filter((d) => d !== "1969-07-20");

    for (const headingId of ["notable-dates-strip-heading", "notable-dates-section-heading"]) {
      const list = copy(html, headingId);
      expect(dateLinks(list)).toEqual(others);
      expect(list).toMatch(/<span [^>]*aria-current="page"[^>]*>(<span [^>]*>)?20 July 1969</);
      expect(list).toContain("Apollo 11 lands on the Moon");
    }
  });
});
