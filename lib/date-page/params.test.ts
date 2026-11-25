import { describe, expect, it } from "vitest";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import {
  FUTURE_DATE_MESSAGE,
  addDays,
  datePagePath,
  isAfterToday,
  parseDatePageParam,
  utcToday,
} from "./params";

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

describe("isAfterToday (Sprint 47, R1: the one future-date rule)", () => {
  const NOW = new Date("2026-11-25T14:00:00.000Z");

  it("allows today and refuses tomorrow", () => {
    expect(isAfterToday("2026-11-25", NOW)).toBe(false);
    expect(isAfterToday("2026-11-26", NOW)).toBe(true);
  });

  it("allows the past, across month and year boundaries", () => {
    expect(isAfterToday("2026-11-24", NOW)).toBe(false);
    expect(isAfterToday("1969-07-20", NOW)).toBe(false);
    expect(isAfterToday("2027-01-01", NOW)).toBe(true);
  });

  it("is decided on the UTC date, so the boundary is 00:00 UTC", () => {
    expect(isAfterToday("2026-11-26", new Date("2026-11-25T23:59:59.999Z"))).toBe(true);
    expect(isAfterToday("2026-11-26", new Date("2026-11-26T00:00:00.000Z"))).toBe(false);
    // 22:00 in New York on the 25th is already the 26th in UTC.
    expect(isAfterToday("2026-11-26", new Date("2026-11-25T22:00:00-05:00"))).toBe(false);
  });

  it("reads the real clock when no instant is given", () => {
    expect(isAfterToday(utcToday())).toBe(false);
    expect(isAfterToday(addDays(utcToday(), 1))).toBe(true);
  });

  it("carries the user's exact wording for the refusal", () => {
    expect(FUTURE_DATE_MESSAGE).toBe("Reloy predicts only the past.");
  });
});

describe("addDays (Sprint 47, R5: UTC calendar arithmetic)", () => {
  it.each([
    ["1969-07-20", -1, "1969-07-19"],
    ["1969-07-20", 1, "1969-07-21"],
    ["2000-02-28", 1, "2000-02-29"],
    ["2001-02-28", 1, "2001-03-01"],
    ["1999-12-31", 1, "2000-01-01"],
    ["2000-03-01", -1, "2000-02-29"],
    ["1900-02-28", 1, "1900-03-01"],
    ["2000-01-01", -1, "1999-12-31"],
    ["1700-01-01", -1, "1699-12-31"],
  ])("%s %+d day is %s", (from, days, expected) => {
    expect(addDays(from, days)).toBe(expected);
  });
});
