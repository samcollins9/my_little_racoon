import { describe, expect, it } from "vitest";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import { datePagePath, parseDatePageParam, utcToday } from "./params";

describe("utcToday (decision d: the UTC date)", () => {
  it("is still the previous UTC day one millisecond before midnight UTC", () => {
    expect(utcToday(new Date("2026-11-15T23:59:59.999Z"))).toBe("2026-11-15");
  });

  it("rolls to the next UTC day exactly at 00:00 UTC", () => {
    expect(utcToday(new Date("2026-11-16T00:00:00.000Z"))).toBe("2026-11-16");
  });

  it("uses UTC, not the host's local offset", () => {
    // 2026-11-16T03:00 at UTC-05:00 is still the 15th locally but the 16th
    // in UTC -- the UTC date is the one that counts.
    expect(utcToday(new Date("2026-11-15T22:00:00-05:00"))).toBe("2026-11-16");
    // And the other way round: already the 16th at UTC+09:00, still the 15th in UTC.
    expect(utcToday(new Date("2026-11-16T08:59:59+09:00"))).toBe("2026-11-15");
  });

  it("reads the real clock when no instant is given", () => {
    const before = new Date().toISOString().slice(0, 10);
    const today = utcToday();
    const after = new Date().toISOString().slice(0, 10);
    expect([before, after]).toContain(today);
  });
});

describe("parseDatePageParam (R1/R7 validation)", () => {
  it.each(["2012-11-11", "1999-08-11", "2024-02-29"])("accepts a real in-range date: %s", (d) => {
    expect(parseDatePageParam(d)).toBe(d);
  });

  it.each(["1700-01-01", "2100-12-31"])("accepts the supported boundary date %s", (d) => {
    expect(parseDatePageParam(d)).toBe(d);
    // ...and a boundary the validator accepts is one the page can render.
    expect(() => computePositions(calculationInstantForDate(d))).not.toThrow();
  });

  it.each(["1699-12-31", "2101-01-01", "0001-01-01", "9999-12-31"])(
    "rejects an out-of-range date: %s",
    (d) => {
      expect(parseDatePageParam(d)).toBeNull();
    }
  );

  it.each([
    "abc",
    "",
    "2012-13-45",
    "2023-02-29",
    "2024-02-30",
    "2012-1-1",
    "12-11-2012",
    "2012-11-11T00:00:00Z",
    " 2012-11-11",
    "2012-11-11 ",
    "2012/11/11",
    "+02012-11-11",
  ])("rejects a malformed or non-calendar date: %j", (d) => {
    expect(parseDatePageParam(d)).toBeNull();
  });

  it.each([undefined, null, 20121111, ["2012-11-11"]])("rejects a non-string value: %j", (v) => {
    expect(parseDatePageParam(v)).toBeNull();
  });
});

describe("datePagePath", () => {
  it("builds /date/YYYY-MM-DD", () => {
    expect(datePagePath("2012-11-11")).toBe("/date/2012-11-11");
  });
});
