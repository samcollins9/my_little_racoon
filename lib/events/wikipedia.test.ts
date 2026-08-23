import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDayEvents } from "./wikipedia";

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
