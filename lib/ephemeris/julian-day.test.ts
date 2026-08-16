import { describe, expect, it } from "vitest";
import { julianDay } from "./julian-day";

describe("julianDay", () => {
  it("matches the Unix epoch's well-known JD", () => {
    expect(julianDay(new Date("1970-01-01T00:00:00Z"))).toBeCloseTo(2440587.5, 6);
  });

  it("matches the design handoff's own reference instant", () => {
    // docs/design/HANDOFF_chart_constellation.md's default state:
    // baseDate 1986-04-26, time 01:23, meta readout "JD 2446546.5576".
    expect(julianDay(new Date("1986-04-26T01:23:00Z"))).toBeCloseTo(2446546.5576, 4);
  });

  it("2000-01-01T12:00:00Z is JD 2451545.0 exactly", () => {
    // Not a claim about astronomical J2000.0, which is defined in TT (a
    // handful of leap seconds off UTC) -- this is the same UT-based JD
    // the rest of this module uses, checked against a round, well-known
    // number for an exact match rather than toBeCloseTo noise.
    expect(julianDay(new Date("2000-01-01T12:00:00Z"))).toBe(2451545.0);
  });
});
