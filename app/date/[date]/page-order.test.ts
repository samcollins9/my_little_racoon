import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_LOOKUP, PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import { ok, renderDatePage, useAnon } from "@/app/reading/[id]/page-test-support";

// Sprint 52, R5/R7: the date page's order, top to bottom, through the real
// page. The DOM order is the order on every layout (no CSS reordering), so
// the markup order is also what Tab and a screen reader follow.

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

const LANDMARKS = {
  banner: "<header",
  dayNavigation: '<nav class="adjacent" aria-label="Previous and next day">',
  dateBand: '<div class="dateBand">',
  body: '<div class="body">',
  anotherDate: '<form class="picker anotherDate"',
  notableDatesPhone: '<nav class="notableSection mobileOnly"',
  notableDatesDesktop: '<nav class="notablePanel desktopOnly"',
};

function order(html: string): string[] {
  return Object.entries(LANDMARKS)
    .map(([name, marker]) => {
      const at = html.indexOf(marker);
      if (at < 0) throw new Error(`${name} (${marker}) not found`);
      expect(html.indexOf(marker, at + 1), `${name} appears once`).toBe(-1);
      return [name, at] as const;
    })
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);
}

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

describe("the date page's order (Sprint 52)", () => {
  it("banner, day links, date band, body, Another date, Notable dates", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([{ event_date: "1912-04-15" }]) });
    const html = unhashClasses(await renderDatePage("1969-07-20"));
    expect(order(html)).toEqual([
      "banner",
      "dayNavigation",
      "dateBand",
      "body",
      "anotherDate",
      "notableDatesPhone",
      "notableDatesDesktop",
    ]);
  });

  it("nothing renders between the date band and the body", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = unhashClasses(await renderDatePage("1969-07-20"));
    // The date band's last element (the JD block) closes, then the band's
    // right side and the band itself, and the body starts at once.
    expect(html).toMatch(/<span class="jdBlock">JD [0-9.]+<\/span><\/div><\/div><div class="body">/);
  });

  it("the day links sit alone in the strip under the banner", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = unhashClasses(await renderDatePage("1969-07-20"));
    expect(html).toMatch(
      /<\/header><div class="flowSlot"><div class="dateNav"><nav class="adjacent" aria-label="Previous and next day">[\s\S]*?<\/nav><\/div><\/div><div class="dateBand">/
    );
  });

  it("exactly one date input and at most one random link", async () => {
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([{ event_date: "1912-04-15" }]) });
    const withPick = unhashClasses(await renderDatePage("1969-07-20"));
    expect(withPick.match(/<input [^>]*type="date"/g)).toHaveLength(1);
    expect(withPick.match(/>Discover random reading</g)).toHaveLength(1);

    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: PAUSED_LOOKUP });
    const withoutPick = unhashClasses(await renderDatePage("1969-07-20"));
    expect(withoutPick.match(/<input [^>]*type="date"/g)).toHaveLength(1);
    expect(withoutPick).not.toContain("Discover random reading");
  });
});
