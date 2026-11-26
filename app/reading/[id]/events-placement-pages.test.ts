import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { EMPTY_LOOKUP } from "@/lib/date-page/test-support";
import { ok, renderDatePage, renderReadingPage, useAnon } from "./page-test-support";

// Sprint 48: where "What happened" sits relative to "The reading", read
// from the server-rendered markup of both pages. The DOM order is the order
// (R3), so the order of the two headings in the markup is what the eye,
// Tab and a screen reader all get. Phones show the same single column in
// that same order, so the markup order is also R6's phone order.
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

const unhashClasses = (html: string) => html.replace(/\b_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}\b/g, "$1");

/** Wikipedia's "selected" list for every month and day; null makes the lookup fail. */
function wikipediaAnswers(selected: { year: number; text: string }[] | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      selected === null
        ? new Response("unavailable", { status: 503 })
        : new Response(JSON.stringify({ selected }), { status: 200 })
    )
  );
}

/** The order the page's landmarks appear in the markup. */
function order(html: string, markers: Record<string, string>): string[] {
  return Object.entries(markers)
    .map(([name, marker]) => {
      const at = html.indexOf(marker);
      if (at < 0) throw new Error(`${name} (${marker}) not found`);
      return [name, at] as const;
    })
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);
}

// The events section by its class, since its heading's text depends on
// the case (Sprint 54, R1); "The reading" by its heading.
const HEADINGS = { events: "eventsSection", reading: ">The reading</h3>" };

const payload = (requestedDate: string, matchedYear: boolean, events: { year: number; text: string }[]) => ({
  source: "wikipedia-onthisday",
  requestedDate,
  matchedYear,
  fetchedAt: "2026-01-01T00:00:00.000Z",
  events,
});

function storedRow(eventDate: string, events: unknown) {
  return {
    id: READING_ID,
    event_date: eventDate,
    positions: computePositions(calculationInstantForDate(eventDate)),
    events,
    horoscope: null,
  };
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

describe("/date/[date] (R2-R4)", () => {
  it("matched (this exact date): What happened, then The reading", async () => {
    wikipediaAnswers([{ year: 1969, text: "Apollo 11 lands" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = await renderDatePage("1969-07-20");
    expect(html).toContain("this exact date");
    expect(html).toContain(">What happened</h2>");
    expect(order(html, HEADINGS)).toEqual(["events", "reading"]);
  });

  it("other years' events: The reading, then the events, headed for the page's day (Sprint 54, R1)", async () => {
    wikipediaAnswers([{ year: 1976, text: "Viking event" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = await renderDatePage("1931-03-03");
    expect(html).toContain("on this day, other years");
    expect(html).toContain(">Other years with 3 March events</h2>");
    expect(html).not.toContain(">What happened</h2>");
    expect(order(html, HEADINGS)).toEqual(["reading", "events"]);
  });

  it("an empty list (no recorded events for this day): What happened stays first", async () => {
    wikipediaAnswers([]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = await renderDatePage("1931-04-04");
    expect(html).toContain("No recorded events for this day.");
    expect(html).toContain(">What happened</h2>");
    expect(order(html, HEADINGS)).toEqual(["events", "reading"]);
  });

  it("a failed lookup: What happened stays first", async () => {
    wikipediaAnswers(null);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = await renderDatePage("1931-05-05");
    expect(html).toContain("No events looked up for this reading.");
    expect(html).toContain(">What happened</h2>");
    expect(order(html, HEADINGS)).toEqual(["events", "reading"]);
  });
});

describe("/reading/[id] follows the same rule for its stored events (R4)", () => {
  it.each([
    ["matched", payload("1969-07-20", true, [{ year: 1969, text: "Apollo 11 lands" }]), ["events", "reading"]],
    ["other years", payload("1969-07-20", false, [{ year: 1976, text: "Viking event" }]), ["reading", "events"]],
    ["empty, unmatched", payload("1969-07-20", false, []), ["events", "reading"]],
    ["null (nothing looked up)", null, ["events", "reading"]],
  ])("%s", async (_, events, expected) => {
    wikipediaAnswers(null);
    useAnon({ get_reading_by_id: ok([storedRow("1969-07-20", events)]) });
    const html = await renderReadingPage(READING_ID);
    expect(order(html, HEADINGS)).toEqual(expected);
    // Sprint 54, R1: the stored row's own date names the other-years heading.
    expect(html).toContain(
      expected[0] === "reading" ? ">Other years with 20 July events</h2>" : ">What happened</h2>"
    );
  });
});

describe("the phone column's order, with Sprint 52's picker panel (R6)", () => {
  // Sprint 52 replaced Sprint 47's phone-only random link at the bottom
  // with the one picker panel (picker, Go, "or Discover random reading"),
  // in the same place: right after the body.
  const PHONE = {
    ...HEADINGS,
    random: '<form class="picker anotherDate"',
    notable: '<nav class="notableSection mobileOnly"',
  };

  it("other years: The reading, the other-years events, the picker panel (with the random link), Notable dates", async () => {
    wikipediaAnswers([{ year: 1976, text: "Viking event" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([{ event_date: "1912-04-15" }]) });
    const html = unhashClasses(await renderDatePage("1931-06-06"));
    expect(order(html, PHONE)).toEqual(["reading", "events", "random", "notable"]);
    // The events still sit inside the card's body, before the phone-only
    // sections that follow it.
    expect(html).toMatch(/>Other years with 6 June events<\/h2>[\s\S]*<\/section><\/div><\/div><form class="picker anotherDate"/);
  });

  it("this exact date: events, reading, then the panel and the notable dates", async () => {
    wikipediaAnswers([{ year: 1931, text: "An event from the exact year" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([{ event_date: "1912-04-15" }]) });
    const html = unhashClasses(await renderDatePage("1931-07-07"));
    expect(order(html, PHONE)).toEqual(["events", "reading", "random", "notable"]);
  });
});

describe("the reading-first order's style hooks (R5)", () => {
  it("below: the reading section stops growing and the events carry the divider on top", async () => {
    wikipediaAnswers([{ year: 1976, text: "Viking event" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = unhashClasses(await renderDatePage("1931-08-08"));
    expect(html).toContain('<section class="readingSection readingSectionFirst">');
    expect(html).toContain('<section class="eventsSection eventsSectionBelow">');
  });

  it("above: neither modifier", async () => {
    wikipediaAnswers([{ year: 1931, text: "An event from the exact year" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, get_recent_reading_dates: ok([]) });
    const html = unhashClasses(await renderDatePage("1931-09-09"));
    expect(html).toContain('<section class="eventsSection">');
    expect(html).toContain('<section class="readingSection">');
  });
});
