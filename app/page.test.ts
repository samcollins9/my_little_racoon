import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sprint 44: `/` itself. redirect() and connection() are replaced by spies,
 * so the test records the order they're called in and the redirect's target.
 * The 307 and the dynamic route are checked against `npm run build` and a
 * real request, not here.
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

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  calls.length = 0;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("/ (Sprint 44)", () => {
  it("waits for the request, then redirects to today's UTC date (R1)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T12:00:00Z") });

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(calls).toEqual(["connection", "redirect /date/2026-11-24"]);
  });

  it("follows midnight UTC, not the server's local day", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T23:59:59.999Z") });
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");
    vi.setSystemTime(new Date("2026-11-25T00:00:00.000Z"));
    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(calls).toEqual([
      "connection",
      "redirect /date/2026-11-24",
      "connection",
      "redirect /date/2026-11-25",
    ]);
  });

  it("makes no outbound request: no Wikipedia, no Supabase (R2)", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-24T12:00:00Z") });

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
