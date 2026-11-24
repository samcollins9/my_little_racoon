import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sprint 41: `/` itself. redirect() and connection() are replaced by spies,
 * so the test records the order they're called in and the redirect's target.
 * The 307 and the dynamic route are checked against `npm run build` and a
 * real request, not here (R4).
 */

const calls: string[] = [];

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {
    calls.push("connection");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    calls.push(`redirect ${path}`);
    // The real redirect() throws to end the render; so does this.
    throw new Error("NEXT_REDIRECT");
  }),
}));

const { default: Home } = await import("./page");

function feedResponse(years: number[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ selected: years.map((year) => ({ year, text: `Event in ${year}`, pages: [] })) }),
  };
}

beforeEach(() => {
  calls.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("/ (Sprint 41)", () => {
  it("waits for the request, then redirects to today's month and day in the latest year with an event (R1, R4)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T12:00:00Z") });
    const fetchMock = vi.fn().mockResolvedValue(feedResponse([1650, 1801, 1999, 2019]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(calls).toEqual(["connection", "redirect /date/2019-11-24"]);
    // R6: the only outbound request is the Wikipedia feed. Nothing calls Supabase.
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/11/24",
    ]);
  });

  it("redirects to today when Wikipedia can't be reached, rather than erroring (R3)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-26T12:00:00Z") });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.wikimedia.org")));

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(calls).toEqual(["connection", "redirect /date/2026-11-26"]);
  });
});
