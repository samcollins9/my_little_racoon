import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { EMPTY_LOOKUP, PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import {
  NAVIGATION_RPCS,
  expectNoWriteAndNoOpenAI,
  ok,
  renderDatePage,
  renderReadingPage,
  useAnon,
} from "./page-test-support";

// Sprint 39, R1-R7 and R10: the accuracy rule, through the real page
// components on both routes, rendered on the server with no client
// JavaScript. The pages run against a recording Supabase double and a
// recording fetch, the same harness as reveal-landing.test.ts.
//
// fetchDayEvents caches Wikipedia's answer per month and day for the life
// of the module, so every date-page case below uses its own month and day.

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

const LEAD_UNMATCHED =
  "We have no recorded events for this exact date, so we can&#x27;t write an accurate horoscope for it.";
// Sprint 54, R2: the message quotes the events heading the page shows,
// "Other years with <D> <Month> events" for the page's own date.
const nextR3 = (dayMonth: string) =>
  `Pick a different date, or choose one of the years listed under &quot;Other years with ${dayMonth} events&quot; to go to that date instead.`;
const NEXT_R4 = "Pick a different date.";
const LEAD_FAILED =
  "The events for this date couldn&#x27;t be loaded, so the horoscope can&#x27;t be written right now.";
const NEXT_R5 = "Try again in a few minutes.";

const SAVED_TEXT = "Saturn keeps the ledger.";
const READING_ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";

type Selected = { year: number; text: string }[];

let fetchSpy: Mock;

/** Wikipedia's "selected" list for every month and day; null makes the lookup fail. */
function wikipediaAnswers(selected: Selected | null) {
  fetchSpy = vi.fn(async () =>
    selected === null
      ? new Response("unavailable", { status: 503 })
      : new Response(JSON.stringify({ selected }), { status: 200 })
  );
  vi.stubGlobal("fetch", fetchSpy);
}

beforeEach(() => {
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  wikipediaAnswers(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** From a section's heading to the end of that <section>, whichever order the two are in (Sprint 48). */
const sectionFrom = (html: string, heading: string) => {
  const start = html.indexOf(heading);
  return html.slice(start, html.indexOf("</section>", start));
};
/** The events section, its own section only, whatever its heading reads (Sprint 54). */
const eventsColumn = (html: string) => sectionFrom(html, "eventsSection");
/** "The reading", its own section only. */
const readingSection = (html: string) => sectionFrom(html, ">The reading<");
/** Every <form> on the page except the date picker's plain GET to /date. */
const writeForms = (html: string) =>
  (html.match(/<form[^>]*>/g) ?? []).filter((tag) => !(/ action="\/date"/.test(tag) && / method="get"/.test(tag)));

/** R6: the message replaces every other reading state. */
function expectOnlyTheMessage(html: string) {
  const section = readingSection(html);
  expect(writeForms(html)).toEqual([]);
  expect(section).not.toContain("<details");
  expect(section).not.toContain("<button");
  expect(section).not.toContain("Reveal the horoscope");
  expect(section).not.toContain("Horoscope generation is currently disabled.");
  expect(section).not.toContain("Saved horoscopes can");
  expect(html).not.toContain(SAVED_TEXT);
}

function storedRow(eventDate: string, events: unknown, horoscope: string | null = SAVED_TEXT) {
  return {
    id: READING_ID,
    event_date: eventDate,
    positions: computePositions(calculationInstantForDate(eventDate)),
    events,
    horoscope,
  };
}

const unmatchedPayload = (requestedDate: string, selected: Selected) => ({
  source: "wikipedia-onthisday",
  requestedDate,
  matchedYear: false,
  fetchedAt: "2026-01-01T00:00:00.000Z",
  events: selected,
});

describe("the date page on an unmatched date", () => {
  it("R1/R3: linkable years are links to the same month and day, others stay plain, and the R3 message shows", async () => {
    wikipediaAnswers([
      { year: 1976, text: "Viking event" },
      { year: 1502, text: "Columbus event" },
      { year: 2050, text: "Far-future event" },
    ]);
    const fake = useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-05-09");
    const events = eventsColumn(html);

    expect(events).toMatch(/<a [^>]*href="\/date\/1976-05-09"[^>]*>1976<\/a>/);
    expect(events).toMatch(/<a [^>]*href="\/date\/2050-05-09"[^>]*>2050<\/a>/);
    expect(events).toContain('aria-label="Go to 9 May 1976"');
    expect(events).not.toMatch(/<a [^>]*>1502<\/a>/);
    expect(events).toMatch(/<span [^>]*>1502<\/span>/);

    expect(readingSection(html)).toContain(`<strong class=`);
    expect(readingSection(html)).toContain(LEAD_UNMATCHED);
    expect(readingSection(html)).toContain(nextR3("9 May"));
    expectOnlyTheMessage(html);
    expectNoWriteAndNoOpenAI(fake, fetchSpy);
  });

  it("R4: every event before 1700, so nothing links and the shorter message shows", async () => {
    wikipediaAnswers([
      { year: 1066, text: "A battle" },
      { year: 1415, text: "Another battle" },
    ]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-06-10");

    expect(eventsColumn(html)).not.toContain("<a ");
    expect(readingSection(html)).toContain(LEAD_UNMATCHED);
    expect(readingSection(html)).toContain(`</strong><br/>${NEXT_R4}</p>`);
    expect(readingSection(html)).not.toContain("What happened");
    expectOnlyTheMessage(html);
  });

  it("R2/R4: no events at all: the empty label, and the shorter message", async () => {
    wikipediaAnswers([]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-07-11");

    expect(eventsColumn(html)).toContain("No recorded events for this day.");
    expect(readingSection(html)).toContain(`</strong><br/>${NEXT_R4}</p>`);
    expectOnlyTheMessage(html);
  });

  it("R6: generation disabled still shows the message, not the disabled panel", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "false");
    wikipediaAnswers([{ year: 1976, text: "Viking event" }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-08-12");

    expect(readingSection(html)).toContain(nextR3("12 August"));
    expectOnlyTheMessage(html);
  });

  it("R6: the saved-horoscope lookup failing still shows the message, not the outage notice", async () => {
    wikipediaAnswers([{ year: 1976, text: "Viking event" }]);
    const fake = useAnon({ get_reading_by_date: PAUSED_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-09-13");

    expect(readingSection(html)).toContain(nextR3("13 September"));
    expectOnlyTheMessage(html);
    expectNoWriteAndNoOpenAI(fake, fetchSpy);
  });

  it("R7: a horoscope saved on an unmatched row is never shown; the fresh lookup decides", async () => {
    wikipediaAnswers([{ year: 1976, text: "A fresh event" }]);
    const fake = useAnon({
      get_reading_by_date: ok([
        storedRow("1931-10-14", unmatchedPayload("1931-10-14", [{ year: 1918, text: "The stored event" }])),
      ]),
      ...NAVIGATION_RPCS,
    });

    const html = await renderDatePage("1931-10-14", { revealed: "1" });

    expect(html).not.toContain(SAVED_TEXT);
    // As if nothing was saved: the events are the fresh lookup's, not the row's.
    expect(html).toContain("A fresh event");
    expect(html).not.toContain("The stored event");
    expect(readingSection(html)).toContain(nextR3("14 October"));
    expectOnlyTheMessage(html);
    expectNoWriteAndNoOpenAI(fake, fetchSpy);
  });

  it("R7: a horoscope saved on a row with null events is never shown either", async () => {
    wikipediaAnswers([{ year: 1976, text: "A fresh event" }]);
    useAnon({ get_reading_by_date: ok([storedRow("1931-11-15", null)]), ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-11-15", { revealed: "1" });

    expect(html).not.toContain(SAVED_TEXT);
    expectOnlyTheMessage(html);
  });
});

describe("the date page when the Wikipedia lookup fails (R5)", () => {
  it("shows the try-again message, with no write form and no links", async () => {
    wikipediaAnswers(null);
    const fake = useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1931-12-16");

    expect(readingSection(html)).toContain(LEAD_FAILED);
    expect(readingSection(html)).toContain(NEXT_R5);
    expect(readingSection(html)).not.toContain(LEAD_UNMATCHED);
    expect(eventsColumn(html)).not.toContain("<a ");
    expectOnlyTheMessage(html);
    expectNoWriteAndNoOpenAI(fake, fetchSpy);
  });
});

describe("the date page on a matched date (R1)", () => {
  it("years stay plain text, and the write form is offered", async () => {
    wikipediaAnswers([{ year: 1969, text: "Apollo 11 lands on the Moon." }]);
    useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage("1969-07-20");

    expect(eventsColumn(html)).not.toContain("<a ");
    expect(readingSection(html)).not.toContain(LEAD_UNMATCHED);
    expect(writeForms(html)).toHaveLength(1);
    expect(readingSection(html)).toMatch(/<button type="submit"[^>]*>Reveal the horoscope<\/button>/);
  });

  it("a matched saved horoscope is still shown (R7: newest-with-horoscope among matched rows)", async () => {
    useAnon({
      get_reading_by_date: ok([
        storedRow("1969-07-21", { ...unmatchedPayload("1969-07-21", []), matchedYear: true }),
      ]),
      ...NAVIGATION_RPCS,
    });

    const html = await renderDatePage("1969-07-21", { revealed: "1" });

    expect(html).toContain(SAVED_TEXT);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("/reading/[id] for a row without exact-year events (R10)", () => {
  it("unmatched with a linkable year: R3's message, no saved horoscope, no generate form, years linked by the row's date", async () => {
    const fake = useAnon({
      get_reading_by_id: ok([
        storedRow(
          "1985-03-04",
          unmatchedPayload("1985-03-04", [
            { year: 1933, text: "An inauguration" },
            { year: 1152, text: "A coronation" },
          ])
        ),
      ]),
    });

    const html = await renderReadingPage(READING_ID, { revealed: "1" });

    expect(eventsColumn(html)).toMatch(/<a [^>]*href="\/date\/1933-03-04"[^>]*>1933<\/a>/);
    expect(eventsColumn(html)).not.toMatch(/<a [^>]*>1152<\/a>/);
    expect(readingSection(html)).toContain(nextR3("4 March"));
    expectOnlyTheMessage(html);
    expectNoWriteAndNoOpenAI(fake, fetchSpy);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("unmatched, every event before 1700: R4's message", async () => {
    useAnon({
      get_reading_by_id: ok([storedRow("1985-03-05", unmatchedPayload("1985-03-05", [{ year: 1600, text: "Old" }]))]),
    });

    const html = await renderReadingPage(READING_ID);

    expect(readingSection(html)).toContain(`</strong><br/>${NEXT_R4}</p>`);
    expectOnlyTheMessage(html);
  });

  it("null events: R5's message", async () => {
    useAnon({ get_reading_by_id: ok([storedRow("1985-03-06", null)]) });

    const html = await renderReadingPage(READING_ID, { revealed: "1" });

    expect(readingSection(html)).toContain(LEAD_FAILED);
    expect(readingSection(html)).toContain(NEXT_R5);
    expectOnlyTheMessage(html);
  });

  it("generation disabled: still the message, not the disabled panel", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "false");
    useAnon({
      get_reading_by_id: ok([storedRow("1985-03-07", unmatchedPayload("1985-03-07", [{ year: 1933, text: "E" }]))]),
    });

    const html = await renderReadingPage(READING_ID, { revealed: "1" });

    expect(readingSection(html)).toContain(nextR3("7 March"));
    expectOnlyTheMessage(html);
  });
});
