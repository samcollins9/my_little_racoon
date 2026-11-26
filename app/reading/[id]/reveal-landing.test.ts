import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { EMPTY_LOOKUP, PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import {
  NAVIGATION_RPCS,
  expectNoWriteAndNoOpenAI as expectNoWriteAndNoOpenAIFrom,
  ok,
  renderDatePage as renderDatePageOn,
  renderReadingPage as renderReadingPageFor,
  useAnon,
} from "./page-test-support";
import { REVEALED_PARAM, withRevealed } from "./reveal";
import { visibleWhen } from "./reveal-test-support";

// Sprint 33, R4/R8: the landing-revealed URL's server render, through the
// real page components on both routes. The pages run against a recording
// Supabase double and a recording fetch. Each test asserts that the render
// made no insert, no set_reading_horoscope, no admin client and no OpenAI
// request, and that the parameter only ever opens a horoscope that is
// already saved.

vi.mock("@/lib/supabase/anon-client", () => ({ createAnonClient: vi.fn() }));
// Only the server actions create this, and only when a form is submitted.
// A render that reaches it has written, or was about to.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("admin client created during a render");
  }),
}));
// The date page calls connection() to opt out of prerendering, which has no
// request to attach to here.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const DATE = "1969-07-20";
const READING_ID = "6f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const SAVED_TEXT = "Mars leans on the door.";

function storedRow(horoscope: string | null) {
  return {
    id: READING_ID,
    event_date: DATE,
    positions: computePositions(calculationInstantForDate(DATE)),
    events: { matchedYear: true, events: [] },
    horoscope,
  };
}

let fetchSpy: Mock;

beforeEach(() => {
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  // Wikipedia (the only fetch a GET render may make) answers with an event
  // from the page's own year. Sprint 39: an unmatched or failed lookup now
  // replaces the whole reading section (accuracy-pages.test.ts covers those),
  // so the states this file checks need matched events.
  fetchSpy = vi.fn(
    async () =>
      new Response(JSON.stringify({ selected: [{ year: 1969, text: "Apollo 11 lands on the Moon." }] }), {
        status: 200,
      })
  );
  vi.stubGlobal("fetch", fetchSpy);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderDatePage = (searchParams: Record<string, string | string[]>) => renderDatePageOn(DATE, searchParams);
const renderReadingPage = (searchParams: Record<string, string | string[]>) =>
  renderReadingPageFor(READING_ID, searchParams);
const expectNoWriteAndNoOpenAI = (fake: ReturnType<typeof useAnon>) => expectNoWriteAndNoOpenAIFrom(fake, fetchSpy);

const detailsTag = (html: string) => html.match(/<details[^>]*>/)?.[0] ?? null;

describe("withRevealed / the parameter both actions redirect with", () => {
  it("appends ?revealed=1 to the page path", () => {
    expect(withRevealed(`/date/${DATE}`)).toBe(`/date/${DATE}?revealed=1`);
    expect(REVEALED_PARAM).toBe("revealed");
  });
});

describe("the date page on the landing-revealed URL (R4/R8)", () => {
  it("a saved horoscope: renders it already unfolded, and writes nothing", async () => {
    const fake = useAnon({ get_reading_by_date: ok([storedRow(SAVED_TEXT)]), ...NAVIGATION_RPCS });

    const html = await renderDatePage({ revealed: "1" });

    expect(detailsTag(html)).toMatch(/\sopen=""/);
    expect(html).toContain(SAVED_TEXT);
    expectNoWriteAndNoOpenAI(fake);
  });

  it("no horoscope: the folded generate state, and nothing is generated or written", async () => {
    const fake = useAnon({ get_reading_by_date: EMPTY_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage({ revealed: "1" });

    expect(html).not.toContain("<details");
    expect(html).toMatch(/<button type="submit"[^>]*>Reveal the horoscope<\/button>/);
    expect(html).toContain("Nothing has been revealed about it yet");
    expectNoWriteAndNoOpenAI(fake);
    // Wikipedia (api.wikimedia.org) only: the render's one permitted network call.
    for (const [url] of fetchSpy.mock.calls) expect(String(url)).toMatch(/^https:\/\/api\.wikimedia\.org\//);
  });

  it("the plain URL with a saved horoscope opens folded", async () => {
    useAnon({ get_reading_by_date: ok([storedRow(SAVED_TEXT)]), ...NAVIGATION_RPCS });

    expect(detailsTag(await renderDatePage({}))).not.toMatch(/\sopen/);
  });

  it.each([["0"], ["true"], [["1", "1"]]])("revealed=%j is not the landing value: folded", async (value) => {
    useAnon({ get_reading_by_date: ok([storedRow(SAVED_TEXT)]), ...NAVIGATION_RPCS });

    expect(detailsTag(await renderDatePage({ revealed: value }))).not.toMatch(/\sopen/);
  });

  it("generation disabled, with a saved horoscope: the reveal is there and the generate form isn't (R5)", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "false");
    const fake = useAnon({ get_reading_by_date: ok([storedRow(SAVED_TEXT)]), ...NAVIGATION_RPCS });

    const html = await renderDatePage({ revealed: "1" });

    expect(detailsTag(html)).toMatch(/\sopen=""/);
    expect(html).toContain("Horoscope generation is currently disabled.");
    expect(html).not.toMatch(/<button type="submit"[^>]*>(Reveal the horoscope|Try again)</);
    expectNoWriteAndNoOpenAI(fake);
  });

  it("the lookup unavailable (Sprint 28, R6): the existing notice, no reveal control", async () => {
    const fake = useAnon({ get_reading_by_date: PAUSED_LOOKUP, ...NAVIGATION_RPCS });

    const html = await renderDatePage({ revealed: "1" });

    expect(html).toContain("Saved horoscopes can’t be loaded right now");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("Reveal the horoscope</");
    expectNoWriteAndNoOpenAI(fake);
  });
});

describe("/reading/[id] on the landing-revealed URL (R4/R6/R8)", () => {
  it("a saved horoscope: renders it already unfolded, and writes nothing", async () => {
    const fake = useAnon({ get_reading_by_id: ok([storedRow(SAVED_TEXT)]) });

    const html = await renderReadingPage({ revealed: "1" });

    expect(detailsTag(html)).toMatch(/\sopen=""/);
    expect(html).toContain(SAVED_TEXT);
    expectNoWriteAndNoOpenAI(fake);
  });

  it("no horoscope: the folded generate state, and nothing is generated or written", async () => {
    const fake = useAnon({ get_reading_by_id: ok([storedRow(null)]) });

    const html = await renderReadingPage({ revealed: "1" });

    expect(html).not.toContain("<details");
    expect(html).toMatch(/<button type="submit"[^>]*>Reveal the horoscope<\/button>/);
    expectNoWriteAndNoOpenAI(fake);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the plain link with a saved horoscope opens folded, with the text in the HTML but hidden", async () => {
    useAnon({ get_reading_by_id: ok([storedRow(SAVED_TEXT)]) });

    const html = await renderReadingPage({});

    expect(detailsTag(html)).not.toMatch(/\sopen/);
    // Sprint 56: the text sits before the toggle rather than inside the
    // disclosure, and CSS hides it while folded (reveal-test-support.ts).
    expect(html).toContain(SAVED_TEXT);
    expect(visibleWhen(html, "folded")).not.toContain(SAVED_TEXT);
  });
});
