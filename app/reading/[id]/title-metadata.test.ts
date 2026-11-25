import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculationInstantForDate, computePositions } from "@/lib/ephemeris/adapter";
import { addDays, utcToday } from "@/lib/date-page/params";
import { PAUSED_LOOKUP } from "@/lib/date-page/test-support";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { generateMetadata as dateMetadata } from "@/app/date/[date]/page";
import ReadingPage, { generateMetadata as readingMetadata } from "./page";
import { ok, useAnon } from "./page-test-support";

// Sprint 49: the page titles. Vitest loads React's client build, where
// cache() doesn't memoize (only a real server render does), so "react" is
// mocked here with a cache() that memoizes per test, standing in for one
// server request. That shows the wiring R3 relies on: the page and its
// metadata both go through the one cached loader. The real server's single
// call is measured against a production build in the handoff.

const requestMemo = new Map<unknown, Map<string, unknown>>();
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    cache: <A extends string, R>(fn: (arg: A) => R) => {
      return (arg: A): R => {
        const memo = requestMemo.get(fn) ?? new Map<string, unknown>();
        requestMemo.set(fn, memo);
        if (!memo.has(arg)) memo.set(arg, fn(arg));
        return memo.get(arg) as R;
      };
    },
  };
});
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

const ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";
const MALFORMED: { data: null; error: unknown; status: number } = {
  data: null,
  error: { code: "22P02", message: "invalid input syntax for type uuid", details: "", hint: "" },
  status: 400,
};

const storedRow = (eventDate: string) => ({
  id: ID,
  event_date: eventDate,
  positions: computePositions(calculationInstantForDate(eventDate)),
  events: null,
  horoscope: null,
});

const dateParams = (date: string) => ({ params: Promise.resolve({ date }) });
const readingParams = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  requestMemo.clear();
  vi.stubEnv("HOROSCOPE_ENABLED", "true");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/date/[date]'s title (R2, R4)", () => {
  it("a valid date: 'Retroactive Horoscope YYYY-MM-DD', with no database or network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await dateMetadata(dateParams("1969-07-20"))).toEqual({ title: "Retroactive Horoscope 1969-07-20" });
    expect(await dateMetadata(dateParams(utcToday()))).toEqual({ title: `Retroactive Horoscope ${utcToday()}` });
    expect(createAnonClient).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["a malformed date", "1969-7-20"],
    ["an impossible date", "2024-02-30"],
    ["an out-of-range date", "2101-01-01"],
    ["a future date (redirected to today)", addDays(utcToday(), 1)],
  ])("%s sets nothing, so the plain title stands", async (_, date) => {
    expect(await dateMetadata(dateParams(date))).toEqual({});
  });
});

describe("/reading/[id]'s title (R3, R4)", () => {
  it("a found reading: its stored event_date", async () => {
    useAnon({ get_reading_by_id: ok([storedRow("1969-07-20")]) });
    expect(await readingMetadata(readingParams(ID))).toEqual({ title: "Retroactive Horoscope 1969-07-20" });
  });

  it.each([
    ["an unknown id", ok([])],
    ["a malformed id (22P02)", MALFORMED],
    ["an outage", PAUSED_LOOKUP],
  ])("%s sets nothing: no date and no error text in the title", async (_, result) => {
    useAnon({ get_reading_by_id: result });
    expect(await readingMetadata(readingParams(ID))).toEqual({});
  });

  it("the metadata and the page share one get_reading_by_id call for the request", async () => {
    const fake = useAnon({ get_reading_by_id: ok([storedRow("1969-07-20")]) });

    const metadata = await readingMetadata(readingParams(ID));
    const page = await ReadingPage({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page as ReactElement);

    expect(metadata).toEqual({ title: "Retroactive Horoscope 1969-07-20" });
    expect(html).toContain("1969");
    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.rpc).toHaveBeenCalledWith("get_reading_by_id", { reading_id: ID });
  });

  it("an unknown id: metadata sets nothing and the page still 404s, still from one call", async () => {
    const fake = useAnon({ get_reading_by_id: ok([]) });
    expect(await readingMetadata(readingParams(ID))).toEqual({});
    await expect(
      ReadingPage({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({}) })
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(fake.rpc).toHaveBeenCalledTimes(1);
  });
});
