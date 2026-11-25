import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_LOOKUP, PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import { ok, renderDatePage, useAnon } from "@/app/reading/[id]/page-test-support";
import DatePickerTarget from "@/app/date/page";

// Sprint 47 through the real date page and the picker's GET target, with
// Next's real redirect() and notFound(): what each throws carries the
// status and target, read from its digest. The clock is fixed at
// 2026-11-25 14:00 UTC.

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

const TODAY = "2026-11-25";
const TOMORROW = "2026-11-26";

const unhashClasses = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");

/** What a render ended with: Next's redirect or 404, read from the thrown digest. */
async function outcome(render: Promise<unknown>): Promise<string> {
  try {
    await render;
    return "rendered";
  } catch (err) {
    const digest = String((err as { digest?: string }).digest ?? "");
    const redirect = digest.match(/^NEXT_REDIRECT;\w+;([^;]+);(\d+);/);
    if (redirect) return `${redirect[2]} ${redirect[1]}`;
    if (digest === "NEXT_HTTP_ERROR_FALLBACK;404") return "404";
    throw err;
  }
}

const pickerTarget = (date: string) => DatePickerTarget({ searchParams: Promise.resolve({ date }) });

/** The opening tag of the element carrying `marker`, whatever its attribute order. */
const tagWith = (html: string, marker: string) =>
  [...html.matchAll(/<[a-z]+ [^>]*>/g)].map((m) => m[0]).find((tag) => tag.includes(marker));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(`${TODAY}T14:00:00.000Z`) });
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("future dates redirect to today (R2)", () => {
  it.each([TOMORROW, "2027-01-01", "2100-12-31"])(
    "/date/%s: 307 to today, before anything is looked up",
    async (date) => {
      const fake = useAnon({});
      expect(await outcome(renderDatePage(date))).toBe(`307 /date/${TODAY}`);
      expect(fake.rpc).not.toHaveBeenCalled();
    }
  );

  it("/date?date=<tomorrow>: 307 to today", async () => {
    expect(await outcome(pickerTarget(TOMORROW))).toBe(`307 /date/${TODAY}`);
  });

  it("today and the past still render or redirect to themselves", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    expect(await outcome(renderDatePage(TODAY))).toBe("rendered");
    expect(await outcome(pickerTarget(TODAY))).toBe(`307 /date/${TODAY}`);
    expect(await outcome(pickerTarget("1969-07-20"))).toBe("307 /date/1969-07-20");
  });

  it.each(["2024-02-30", "2101-01-01"])("invalid or out-of-range %s is still a 404", async (date) => {
    useAnon({});
    expect(await outcome(renderDatePage(date))).toBe("404");
    expect(await outcome(pickerTarget(date))).toBe("404");
  });

  it("the redirect uses the UTC date: at 23:59:59.999 UTC tomorrow is still refused", async () => {
    vi.setSystemTime(new Date(`${TODAY}T23:59:59.999Z`));
    useAnon({});
    expect(await outcome(renderDatePage(TOMORROW))).toBe(`307 /date/${TODAY}`);
  });
});

describe("the picker's max is today (R3)", () => {
  it("max is today's UTC date and min the engine's first date", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const input = tagWith(await renderDatePage("1969-07-20"), 'id="date-page-picker"');
    expect(input).toContain(`max="${TODAY}"`);
    expect(input).toContain('min="1700-01-01"');
  });
});

describe("Previous day / Next day on the page (R5)", () => {
  it("still both render when every database lookup fails", async () => {
    useAnon({ get_reading_by_date: PAUSED_LOOKUP, get_recent_reading_dates: PAUSED_LOOKUP });
    const html = unhashClasses(await renderDatePage("1969-07-20"));
    expect(tagWith(html, 'href="/date/1969-07-19"')).toContain('rel="prev"');
    expect(tagWith(html, 'href="/date/1969-07-21"')).toContain('rel="next"');
  });

  it("today's page: Next day disabled with the message", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = unhashClasses(await renderDatePage(TODAY));
    expect(html).not.toContain(`href="/date/${TOMORROW}"`);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("Reloy predicts only the past.");
  });
});

describe("Discover random reading on the page (R6)", () => {
  const RECENT = ok([
    { event_date: "2026-11-27" },
    { event_date: "1969-07-20" },
    { event_date: "1912-04-15" },
    { event_date: "2001-09-11" },
  ]);

  it("picks from the recent dates with the page's random source, never the page's own date or the future", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: RECENT });
    // The pool on /date/1969-07-20 is [1912-04-15, 2001-09-11]; the tagline
    // takes the other Math.random() call.
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    const html = unhashClasses(await renderDatePage("1969-07-20"));
    expect(html).toMatch(/<a [^>]*href="\/date\/2001-09-11"[^>]*>Discover random reading<\/a>/);
  });

  it("calls only the two lookups, and the random one takes no argument", async () => {
    const fake = useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: RECENT });
    await renderDatePage("1969-07-20");
    const called = new Set(fake.rpc.mock.calls.map(([name]) => name));
    expect(called).toEqual(new Set(["get_reading_by_date", "get_recent_reading_dates"]));
    expect(fake.rpc).toHaveBeenCalledWith("get_recent_reading_dates");
  });

  it.each([
    ["the lookup fails", PAUSED_LOOKUP],
    ["the pool is empty", ok([])],
    ["only the page's own date and the future are left", ok([{ event_date: "1969-07-20" }, { event_date: "2030-01-01" }])],
  ])("no link and no 'or' when %s; the rest of the strip is unchanged", async (_, recent) => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: recent });
    const html = unhashClasses(await renderDatePage("1969-07-20"));
    expect(html).not.toContain("Discover random reading");
    expect(html).not.toContain('class="pickerOr"');
    expect(html).toContain(">Go</button>");
    expect(html).toContain('href="/date/1969-07-19"');
  });
});
