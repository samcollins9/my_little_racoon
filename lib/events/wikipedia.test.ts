import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { entryMatchesDateYear, fetchDayEvents, fetchDayEventYears } from "./wikipedia";

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function selectedEntry(year: number, text: string, sourceUrl?: string) {
  return {
    year,
    text,
    pages: sourceUrl ? [{ content_urls: { desktop: { page: sourceUrl } } }] : [],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchDayEvents", () => {
  it("matchedYear: true when an entry's year matches the reading's year (R3, R8)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        selected: [
          selectedEntry(1889, "Something else happened", "https://en.wikipedia.org/wiki/Something"),
          selectedEntry(1977, "The exact year asked for", "https://en.wikipedia.org/wiki/Exact"),
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDayEvents("1977-01-15");

    expect(payload).not.toBeNull();
    expect(payload!.matchedYear).toBe(true);
    expect(payload!.requestedDate).toBe("1977-01-15");
    expect(payload!.source).toBe("wikipedia-onthisday");
    expect(payload!.events).toEqual([
      { year: 1977, text: "The exact year asked for", sourceUrl: "https://en.wikipedia.org/wiki/Exact" },
    ]);
  });

  it("matchedYear: false falls back to the top 5 unfiltered entries (R3)", async () => {
    const entries = Array.from({ length: 8 }, (_, i) => selectedEntry(1900 + i, `Event ${i}`));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ selected: entries }));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDayEvents("2020-02-02");

    expect(payload!.matchedYear).toBe(false);
    expect(payload!.events).toHaveLength(5);
    expect(payload!.events[0].text).toBe("Event 0");
  });

  it("omits sourceUrl when pages/content_urls is missing (R2)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ selected: [selectedEntry(2010, "No linked page")] })
    );
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDayEvents("2010-03-03");

    expect(payload!.events).toEqual([{ year: 2010, text: "No linked page" }]);
  });

  it("sends a descriptive User-Agent header (R1)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ selected: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchDayEvents("2004-04-04");

    const [, options] = fetchMock.mock.calls[0];
    const userAgent = (options.headers as Record<string, string>)["User-Agent"];
    expect(userAgent).toBeTruthy();
    expect(userAgent.toLowerCase()).not.toBe("node");
  });

  it("requests zero-padded month/day and caches by month/day, not full date (R4)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ selected: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchDayEvents("1977-05-06");
    await fetchDayEvents("2020-05-06"); // same month/day, different year

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/05/06");
  });

  it("a non-2xx response does not block the save -- resolves null and logs (R6, R12)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 503));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDayEvents("2011-07-07");

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("a rejected fetch does not block the save -- resolves null and logs (R6, R12)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDayEvents("2012-08-08");

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("a timeout does not block the save -- resolves null and logs (R6, R7, R12)", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchDayEvents("2013-09-09");
    await vi.advanceTimersByTimeAsync(5000);
    const payload = await pending;

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("an absent `selected` fails closed and is not cached (R11)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchDayEvents("2014-10-10");
    const second = await fetchDayEvents("2015-10-10"); // same month/day

    expect(first).toBeNull();
    expect(second).toBeNull();
    // Not cached: both calls hit the network rather than the second
    // reusing a cached failure-shaped result.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a non-array `selected` fails closed and is not cached (R11)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ selected: "not an array" }));
    vi.stubGlobal("fetch", fetchMock);

    const payload = await fetchDayEvents("2016-11-11");

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("a genuinely empty `selected` array is a real answer and is cached (R11)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ selected: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchDayEvents("2017-12-12");
    const second = await fetchDayEvents("2018-12-12"); // same month/day

    expect(first).not.toBeNull();
    expect(first!.matchedYear).toBe(false);
    expect(first!.events).toEqual([]);
    expect(second).not.toBeNull();
    // Cached: the second call reuses the first's result rather than
    // hitting the network again.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("entryMatchesDateYear (Sprint 41, R2)", () => {
  it("is true only for the date's own year", () => {
    expect(entryMatchesDateYear(1969, "1969-07-20")).toBe(true);
    expect(entryMatchesDateYear(1968, "1969-07-20")).toBe(false);
    expect(entryMatchesDateYear(1970, "1969-07-20")).toBe(false);
  });
});

describe("fetchDayEventYears (Sprint 41)", () => {
  it("returns the entries' years in feed order, from the same request fetchDayEvents makes (R5)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ selected: [selectedEntry(1999, "A"), selectedEntry(1801, "B"), selectedEntry(2019, "C")] })
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchDayEventYears("2026-06-14")).toEqual([1999, 1801, 2019]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/06/14");
    expect(init.headers["User-Agent"]).toMatch(/^RetroactiveHoroscope\/1\.0 /);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("shares fetchDayEvents' month/day cache in both directions -- one request in total (R5)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ selected: [selectedEntry(2019, "C")] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchDayEventYears("2026-06-15");
    const payload = await fetchDayEvents("2019-06-15");
    expect(await fetchDayEventYears("2027-06-15")).toEqual([2019]);

    expect(payload!.matchedYear).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolves null and logs when the request fails, never throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchDayEventYears("2026-06-16")).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("fetchDayEventYears failed", expect.any(Error));
  });

  it("resolves null for a non-2xx response or a missing `selected`, and caches neither", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 503))
      .mockResolvedValueOnce(jsonResponse({ unexpected: true }))
      .mockResolvedValueOnce(jsonResponse({ selected: [selectedEntry(2001, "X")] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchDayEventYears("2026-06-17")).toBeNull();
    expect(await fetchDayEventYears("2026-06-17")).toBeNull();
    expect(await fetchDayEventYears("2026-06-17")).toEqual([2001]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("resolves an empty list for a genuinely empty feed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ selected: [] })));

    expect(await fetchDayEventYears("2026-06-18")).toEqual([]);
  });
});
