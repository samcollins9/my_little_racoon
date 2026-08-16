import { describe, expect, it } from "vitest";
import {
  MAX_SUPPORTED_DATE,
  MIN_SUPPORTED_DATE,
  PLANET_NAMES,
  UnsupportedDateRangeError,
  InvalidDateFormatError,
  calculationInstantForDate,
  computePositions,
  instantFromDateAndTime,
} from "./adapter";

/**
 * Reference values are apparent geocentric ecliptic longitude ("ObsEcLon")
 * from JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api), CENTER =
 * geocentric (500@399), QUANTITIES=31, fetched directly for this sprint --
 * an independent source, not this codebase's own output. One instant per
 * century covered (19th, 20th, 21st), per R8.
 *
 * Tolerance is 0.05 degrees (3 arcminutes), above the ephemeris adapter's
 * documented ±1 arcminute accuracy claim to avoid flakiness, but far
 * tighter than any bug worth catching here (wrong body, wrong sign
 * convention, heliocentric-instead-of-geocentric, degrees/radians mixup)
 * would produce -- those are off by tens of degrees, not hundredths.
 */
const TOLERANCE_DEG = 0.05;

const REFERENCE_CASES: Array<{ date: string; body: (typeof PLANET_NAMES)[number]; elon: number }> = [
  { date: "1850-01-01T00:00:00Z", body: "Sun", elon: 280.2876997 },
  { date: "1850-01-01T00:00:00Z", body: "Moon", elon: 134.4089578 },
  { date: "1850-01-01T00:00:00Z", body: "Mercury", elon: 287.7134346 },
  { date: "1850-01-01T00:00:00Z", body: "Venus", elon: 265.5866183 },
  { date: "1850-01-01T00:00:00Z", body: "Mars", elon: 81.4308739 },
  { date: "1850-01-01T00:00:00Z", body: "Jupiter", elon: 173.0056583 },
  { date: "1850-01-01T00:00:00Z", body: "Saturn", elon: 1.8658084 },
  { date: "1850-01-01T00:00:00Z", body: "Uranus", elon: 22.3261614 },
  { date: "1850-01-01T00:00:00Z", body: "Neptune", elon: 332.6857281 },
  { date: "1850-01-01T00:00:00Z", body: "Pluto", elon: 26.9139797 },

  { date: "1950-06-15T00:00:00Z", body: "Sun", elon: 83.3320656 },
  { date: "1950-06-15T00:00:00Z", body: "Moon", elon: 75.9445371 },
  { date: "1950-06-15T00:00:00Z", body: "Mercury", elon: 60.4779394 },
  { date: "1950-06-15T00:00:00Z", body: "Venus", elon: 45.459865 },
  { date: "1950-06-15T00:00:00Z", body: "Mars", elon: 181.180772 },
  { date: "1950-06-15T00:00:00Z", body: "Jupiter", elon: 337.2213472 },
  { date: "1950-06-15T00:00:00Z", body: "Saturn", elon: 163.3776879 },
  { date: "1950-06-15T00:00:00Z", body: "Uranus", elon: 94.4490125 },
  { date: "1950-06-15T00:00:00Z", body: "Neptune", elon: 194.6104157 },
  { date: "1950-06-15T00:00:00Z", body: "Pluto", elon: 136.2740948 },

  { date: "2024-03-20T12:00:00Z", body: "Sun", elon: 0.3680844 },
  { date: "2024-03-20T12:00:00Z", body: "Moon", elon: 128.2881499 },
  { date: "2024-03-20T12:00:00Z", body: "Mercury", elon: 17.9740029 },
  { date: "2024-03-20T12:00:00Z", body: "Venus", elon: 340.6300244 },
  { date: "2024-03-20T12:00:00Z", body: "Mars", elon: 328.0618753 },
  { date: "2024-03-20T12:00:00Z", body: "Jupiter", elon: 44.9602019 },
  { date: "2024-03-20T12:00:00Z", body: "Saturn", elon: 342.2692969 },
  { date: "2024-03-20T12:00:00Z", body: "Uranus", elon: 50.2692115 },
  { date: "2024-03-20T12:00:00Z", body: "Neptune", elon: 357.4743468 },
  { date: "2024-03-20T12:00:00Z", body: "Pluto", elon: 301.6679599 },
];

function shortestAngleDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

describe("computePositions against JPL Horizons reference dates", () => {
  const byDate = new Map<string, ReturnType<typeof computePositions>>();
  for (const { date } of REFERENCE_CASES) {
    if (!byDate.has(date)) {
      byDate.set(date, computePositions(new Date(date)));
    }
  }

  it.each(REFERENCE_CASES)(
    "$body on $date matches Horizons within tolerance",
    ({ date, body, elon }) => {
      const positions = byDate.get(date)!;
      const position = positions.find((p) => p.body === body)!;
      const diff = Math.abs(shortestAngleDiff(position.eclipticLongitude, elon));
      expect(diff).toBeLessThan(TOLERANCE_DEG);
    }
  );

  it("covers all ten bodies at each reference instant", () => {
    for (const [, positions] of byDate) {
      expect(positions.map((p) => p.body).sort()).toEqual([...PLANET_NAMES].sort());
    }
  });
});

describe("no houses or angles anywhere in the model (R7)", () => {
  it("a position has exactly body, eclipticLongitude, sign, degreeInSign, retrograde", () => {
    const positions = computePositions(new Date("2000-01-01T12:00:00Z"));
    for (const position of positions) {
      expect(Object.keys(position).sort()).toEqual(
        ["body", "degreeInSign", "eclipticLongitude", "retrograde", "sign"].sort()
      );
    }
  });
});

describe("date range validation (R4)", () => {
  it("accepts a date at the start of the supported range", () => {
    expect(() => computePositions(MIN_SUPPORTED_DATE)).not.toThrow();
  });

  it("accepts a date at the end of the supported range", () => {
    expect(() => computePositions(MAX_SUPPORTED_DATE)).not.toThrow();
  });

  it("rejects a date before the supported range", () => {
    const tooEarly = new Date(MIN_SUPPORTED_DATE.getTime() - 24 * 60 * 60 * 1000);
    expect(() => computePositions(tooEarly)).toThrow(UnsupportedDateRangeError);
  });

  it("rejects a date after the supported range", () => {
    const tooLate = new Date(MAX_SUPPORTED_DATE.getTime() + 24 * 60 * 60 * 1000);
    expect(() => computePositions(tooLate)).toThrow(UnsupportedDateRangeError);
  });
});

describe("calculationInstantForDate", () => {
  it("fixes the calculation at the documented UTC hour", () => {
    expect(calculationInstantForDate("2024-03-20").toISOString()).toBe(
      "2024-03-20T12:00:00.000Z"
    );
  });

  it("rejects a malformed date string with a clear error, not a silent bad date", () => {
    expect(() => calculationInstantForDate("03/20/2024")).toThrow(InvalidDateFormatError);
    expect(() => calculationInstantForDate("not-a-date")).toThrow(InvalidDateFormatError);
  });

  it("rejects a syntactically valid but nonexistent calendar date", () => {
    expect(() => calculationInstantForDate("2024-02-30")).toThrow(InvalidDateFormatError);
  });
});

describe("instantFromDateAndTime", () => {
  it("combines date and time into the exact UTC instant", () => {
    expect(instantFromDateAndTime("2024-03-20", "05:30").toISOString()).toBe(
      "2024-03-20T05:30:00.000Z"
    );
  });

  it("a different time on the same date changes the instant", () => {
    const morning = instantFromDateAndTime("2024-03-20", "00:00");
    const evening = instantFromDateAndTime("2024-03-20", "23:59");
    expect(evening.getTime() - morning.getTime()).toBe((23 * 60 + 59) * 60 * 1000);
  });

  it("rejects a malformed time string", () => {
    expect(() => instantFromDateAndTime("2024-03-20", "5:30")).toThrow(InvalidDateFormatError);
    expect(() => instantFromDateAndTime("2024-03-20", "not-a-time")).toThrow(
      InvalidDateFormatError
    );
  });

  it("rejects an outright invalid time (parses to Invalid Date)", () => {
    expect(() => instantFromDateAndTime("2024-03-20", "25:00")).toThrow(InvalidDateFormatError);
    expect(() => instantFromDateAndTime("2024-03-20", "23:61")).toThrow(InvalidDateFormatError);
  });

  it("rejects 24:00, which JS silently rolls to the next day", () => {
    expect(() => instantFromDateAndTime("2024-03-20", "24:00")).toThrow(InvalidDateFormatError);
  });

  it("still rejects a malformed date", () => {
    expect(() => instantFromDateAndTime("03/20/2024", "05:30")).toThrow(InvalidDateFormatError);
  });
});
