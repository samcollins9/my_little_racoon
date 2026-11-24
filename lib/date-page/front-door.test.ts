import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDayEvents } from "../events/wikipedia";
import { frontDoorDate, frontDoorDateFromYears } from "./front-door";
import { utcToday } from "./params";

/**
 * Sprint 41. fetchDayEvents' cache is keyed by month and day for the life of
 * the module, so every test that goes through the real feed uses a month
 * and day no other test here uses.
 */

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function feedResponse(years: number[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ selected: years.map((year) => ({ year, text: `Event in ${year}`, pages: [] })) }),
  };
}

describe("frontDoorDateFromYears (R1)", () => {
  it("lands on the largest qualifying year", () => {
    expect(frontDoorDateFromYears([1650, 1801, 1999, 2019], "2026-11-24")).toBe("2019-11-24");
  });

  it("doesn't depend on the feed's order", () => {
    expect(frontDoorDateFromYears([2019, 1650, 1999, 1801], "2026-11-24")).toBe("2019-11-24");
    expect(frontDoorDateFromYears([1801, 2019, 2019, 1999], "2026-11-24")).toBe("2019-11-24");
  });

  it("allows today's own year", () => {
    expect(frontDoorDateFromYears([1999, 2026], "2026-11-24")).toBe("2026-11-24");
  });

  it("skips a year later than today's, even inside the supported range", () => {
    expect(frontDoorDateFromYears([2027, 2050, 1999], "2026-11-24")).toBe("1999-11-24");
  });

  it("skips years before 1700", () => {
    expect(frontDoorDateFromYears([1066, 1699, 1700], "2026-11-24")).toBe("1700-11-24");
  });

  it("skips years the date page can't take: BC (negative), fractional and NaN", () => {
    expect(frontDoorDateFromYears([-44, 1999.5, Number.NaN, 1850], "2026-11-24")).toBe("1850-11-24");
  });

  describe("29 February", () => {
    it("in a leap current year, lands on the latest leap year, skipping the non-leap ones", () => {
      // 2025 and 2027 aren't leap years, and neither is 1900 (a century not divisible by 400).
      expect(frontDoorDateFromYears([1900, 2025, 2027, 1996], "2028-02-29")).toBe("1996-02-29");
      expect(frontDoorDateFromYears([1900, 2024, 2025], "2028-02-29")).toBe("2024-02-29");
    });

    it("in a leap current year, falls back to today when no listed year is a leap year", () => {
      expect(frontDoorDateFromYears([1900, 2025, 1999], "2028-02-29")).toBe("2028-02-29");
    });

    it("in a non-leap current year, today is never 29 February: 28 Feb's next UTC day is 1 March", () => {
      expect(utcToday(new Date("2027-02-28T23:59:59.999Z"))).toBe("2027-02-28");
      expect(utcToday(new Date("2027-03-01T00:00:00.000Z"))).toBe("2027-03-01");
      // A 28 February that lists a 29 February-only year still lands on 28 February.
      expect(frontDoorDateFromYears([2024, 2025], "2027-02-28")).toBe("2025-02-28");
    });
  });
});

describe("fallback to today (R3)", () => {
  it("when the feed couldn't be read (null)", () => {
    expect(frontDoorDateFromYears(null, "2026-11-24")).toBe("2026-11-24");
  });

  it("when the feed is empty", () => {
    expect(frontDoorDateFromYears([], "2026-11-24")).toBe("2026-11-24");
  });

  it("when no year qualifies (R1's second criterion: only years before 1700)", () => {
    expect(frontDoorDateFromYears([1066, 1492, 1650], "2026-11-24")).toBe("2026-11-24");
  });

  it("when no year qualifies (only years later than today's)", () => {
    expect(frontDoorDateFromYears([2030, 2099], "2026-11-24")).toBe("2026-11-24");
  });

  it("through the real feed: a failed request, a non-2xx and an unexpected shape all land on today", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ nothing: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(frontDoorDate("2026-01-21")).resolves.toBe("2026-01-21");
    await expect(frontDoorDate("2026-01-22")).resolves.toBe("2026-01-22");
    await expect(frontDoorDate("2026-01-23")).resolves.toBe("2026-01-23");
    expect(errorSpy).toHaveBeenCalledTimes(3);
  });

  it("through the real feed: an empty feed lands on today", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(feedResponse([])));

    await expect(frontDoorDate("2026-01-24")).resolves.toBe("2026-01-24");
  });
});

describe("the chosen date is writable (R2)", () => {
  it("one fixture through both the selector and fetchDayEvents: matchedYear is true, with one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(feedResponse([1650, 1801, 1999, 2019]));
    vi.stubGlobal("fetch", fetchMock);

    const chosen = await frontDoorDate("2026-07-20");
    const events = await fetchDayEvents(chosen);

    expect(chosen).toBe("2019-07-20");
    expect(events!.matchedYear).toBe(true);
    expect(events!.events.map((event) => event.year)).toEqual([2019]);
    // R5: the date page reads the entries the front door already fetched.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("the fallback date isn't matched, so the landed page shows Sprint 39's message instead", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(feedResponse([1650, 1492])));

    const chosen = await frontDoorDate("2026-07-21");
    const events = await fetchDayEvents(chosen);

    expect(chosen).toBe("2026-07-21");
    expect(events!.matchedYear).toBe(false);
  });
});

describe("the clock (R8)", () => {
  it("asks the feed for the UTC day either side of midnight", async () => {
    const fetchYears = vi.fn().mockResolvedValue([1999]);

    await expect(frontDoorDate(utcToday(new Date("2026-11-24T23:59:59.999Z")), fetchYears)).resolves.toBe(
      "1999-11-24"
    );
    await expect(frontDoorDate(utcToday(new Date("2026-11-25T00:00:00.000Z")), fetchYears)).resolves.toBe(
      "1999-11-25"
    );
    expect(fetchYears.mock.calls).toEqual([["2026-11-24"], ["2026-11-25"]]);
  });

  it("across New Year, a year that was later than today's stops being skipped", async () => {
    const fetchYears = vi.fn().mockResolvedValue([2026, 1999]);

    await expect(frontDoorDate(utcToday(new Date("2025-12-31T23:59:59.999Z")), fetchYears)).resolves.toBe(
      "1999-12-31"
    );
    // A real feed is per month and day, so the stub stands in for both days.
    await expect(frontDoorDate(utcToday(new Date("2026-01-01T00:00:00.000Z")), fetchYears)).resolves.toBe(
      "2026-01-01"
    );
  });
});
