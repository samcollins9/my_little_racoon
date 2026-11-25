import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dayNavigation, loadRandomReadingDate, pickRandomReadingDate } from "./navigation";
import { PAUSED_LOOKUP, fakeSupabase, type FakeResult } from "./test-support";

const NOW = new Date("2026-11-25T14:00:00.000Z");
const TODAY = "2026-11-25";

const ok = (data: unknown): FakeResult => ({ data, error: null, status: 200 });
const rows = (...dates: string[]) => dates.map((event_date) => ({ event_date }));

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("dayNavigation (Sprint 47, R5)", () => {
  it("an ordinary date: the day before and the day after, both links", () => {
    expect(dayNavigation("1969-07-20", NOW)).toEqual({
      previous: "1969-07-19",
      next: { kind: "link", date: "1969-07-21" },
    });
  });

  it("crosses month ends, year ends and 29 February", () => {
    expect(dayNavigation("2000-02-28", NOW).next).toEqual({ kind: "link", date: "2000-02-29" });
    expect(dayNavigation("2001-02-28", NOW).next).toEqual({ kind: "link", date: "2001-03-01" });
    expect(dayNavigation("1999-12-31", NOW).next).toEqual({ kind: "link", date: "2000-01-01" });
    expect(dayNavigation("2000-03-01", NOW).previous).toBe("2000-02-29");
  });

  it("on the first supported date, 1700-01-01, there's no previous day", () => {
    expect(dayNavigation("1700-01-01", NOW)).toEqual({
      previous: null,
      next: { kind: "link", date: "1700-01-02" },
    });
  });

  it("on today's page, the next day is the future: disabled, never a link", () => {
    expect(dayNavigation(TODAY, NOW)).toEqual({ previous: "2026-11-24", next: { kind: "future" } });
  });

  it("yesterday's page still links to today", () => {
    expect(dayNavigation("2026-11-24", NOW).next).toEqual({ kind: "link", date: TODAY });
  });

  it("'today' is the UTC date: just before midnight UTC, tomorrow is still the future", () => {
    expect(dayNavigation(TODAY, new Date("2026-11-25T23:59:59.999Z")).next).toEqual({ kind: "future" });
    expect(dayNavigation(TODAY, new Date("2026-11-26T00:00:00.000Z")).next).toEqual({
      kind: "link",
      date: "2026-11-26",
    });
  });
});

describe("pickRandomReadingDate (Sprint 47, R6)", () => {
  const POOL = rows("2026-11-20", "1969-07-20", "1912-04-15", "2001-09-11");

  it("picks by the injected random source", () => {
    expect(pickRandomReadingDate(POOL, "2012-11-11", () => 0, NOW)).toBe("2026-11-20");
    expect(pickRandomReadingDate(POOL, "2012-11-11", () => 0.5, NOW)).toBe("1912-04-15");
    expect(pickRandomReadingDate(POOL, "2012-11-11", () => 0.999, NOW)).toBe("2001-09-11");
  });

  it("never picks the page's own date", () => {
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickRandomReadingDate(POOL, "1969-07-20", () => value, NOW)).not.toBe("1969-07-20");
    }
    expect(pickRandomReadingDate(POOL, "1969-07-20", () => 0.4, NOW)).toBe("1912-04-15");
  });

  it("never picks a date after today, even if one is saved", () => {
    const withFuture = rows("2031-11-15", TODAY, "2026-11-26");
    for (const value of [0, 0.34, 0.67, 0.999]) {
      expect(pickRandomReadingDate(withFuture, "1969-07-20", () => value, NOW)).toBe(TODAY);
    }
  });

  it("nothing left after filtering, or no rows at all, gives null", () => {
    expect(pickRandomReadingDate(rows("1969-07-20"), "1969-07-20", () => 0, NOW)).toBeNull();
    expect(pickRandomReadingDate(rows("2031-11-15"), "1969-07-20", () => 0, NOW)).toBeNull();
    expect(pickRandomReadingDate([], "1969-07-20", () => 0, NOW)).toBeNull();
    expect(pickRandomReadingDate(null, "1969-07-20", () => 0, NOW)).toBeNull();
  });

  it("an out-of-range random value still picks from the pool", () => {
    expect(pickRandomReadingDate(POOL, "2012-11-11", () => 1, NOW)).toBe("2001-09-11");
    expect(pickRandomReadingDate(POOL, "2012-11-11", () => Number.NaN, NOW)).toBe("2026-11-20");
  });
});

describe("loadRandomReadingDate (Sprint 47, R6)", () => {
  it("calls only get_recent_reading_dates, and never touches the table", async () => {
    const fake = fakeSupabase({ rpc: { get_recent_reading_dates: ok(rows("1969-07-20")) } });
    expect(await loadRandomReadingDate(fake.client, "2012-11-11", "test", () => 0)).toBe("1969-07-20");
    expect(fake.rpc).toHaveBeenCalledWith("get_recent_reading_dates");
    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.from).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("a failed lookup gives null and is logged in full", async () => {
    const fake = fakeSupabase({ rpc: { get_recent_reading_dates: PAUSED_LOOKUP } });
    expect(await loadRandomReadingDate(fake.client, "2012-11-11", "test", () => 0)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0][0])).toContain("test (recent dates)");
  });

  it("an empty result gives null without logging an outage", async () => {
    const fake = fakeSupabase({ rpc: { get_recent_reading_dates: ok([]) } });
    expect(await loadRandomReadingDate(fake.client, "2012-11-11", "test", () => 0)).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
