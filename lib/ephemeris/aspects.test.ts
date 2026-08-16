import { describe, expect, it } from "vitest";
import { computePositions } from "./adapter";
import { computeAspects } from "./aspects";

/**
 * Reference data: same three JPL Horizons instants Sprint 6 verified
 * (1850, 1950, 2024, one per century), plus one day later at each --
 * fetched the same way (ssd.jpl.nasa.gov/api/horizons.api, geocentric
 * apparent ecliptic longitude), so the "later" position is real recomputed
 * data, not extrapolated from a single body's assumed speed. Expected
 * aspects, orbs, and applying/separating were computed independently in
 * Python directly from that raw longitude data (not by running this
 * module) -- see the sprint's own commit message for that script.
 *
 * Tolerance is 0.1 degrees: an orb is derived from two ~0.05-degree
 * longitudes (astronomy-engine's own accuracy claim, Sprint 6), so error
 * can compound across the pair. Still far tighter than any bug worth
 * catching (wrong aspect, wrong applying/separating direction) would
 * produce.
 */
const TOLERANCE_DEG = 0.1;

function positionsAt(iso: string) {
  return computePositions(new Date(iso));
}

function oneDayLater(iso: string): Date {
  return new Date(new Date(iso).getTime() + 24 * 60 * 60 * 1000);
}

describe("computeAspects against JPL Horizons reference instants", () => {
  const cases: Array<{
    date: string;
    bodyA: string;
    bodyB: string;
    aspect: string;
    orb: number;
    applying: boolean;
  }> = [
    // 1850-01-01: Uranus-Pluto conjunction with Pluto retrograde (R3/R10's
    // retrograde-body case) -- both bodies' real t+1 motion says applying.
    { date: "1850-01-01T00:00:00Z", bodyA: "Uranus", bodyB: "Pluto", aspect: "conjunction", orb: 4.5878, applying: true },
    { date: "1850-01-01T00:00:00Z", bodyA: "Sun", bodyB: "Mercury", aspect: "conjunction", orb: 7.4257, applying: false },
    { date: "1850-01-01T00:00:00Z", bodyA: "Venus", bodyB: "Mars", aspect: "opposition", orb: 4.1557, applying: false },
    { date: "1850-01-01T00:00:00Z", bodyA: "Mercury", bodyB: "Jupiter", aspect: "trine", orb: 5.2922, applying: true },

    // 1950-06-15: a clean applying conjunction (Sun-Moon) and a clean
    // separating sextile (Neptune-Pluto), neither involving a retrograde
    // body -- the ordinary case, checked alongside the extraordinary one.
    { date: "1950-06-15T00:00:00Z", bodyA: "Sun", bodyB: "Moon", aspect: "conjunction", orb: 7.3875, applying: true },
    { date: "1950-06-15T00:00:00Z", bodyA: "Neptune", bodyB: "Pluto", aspect: "sextile", orb: 1.6637, applying: false },
    { date: "1950-06-15T00:00:00Z", bodyA: "Jupiter", bodyB: "Saturn", aspect: "opposition", orb: 6.1563, applying: false },

    // 2024-03-20: near the March equinox.
    { date: "2024-03-20T12:00:00Z", bodyA: "Sun", bodyB: "Neptune", aspect: "conjunction", orb: 2.8937, applying: false },
    { date: "2024-03-20T12:00:00Z", bodyA: "Venus", bodyB: "Saturn", aspect: "conjunction", orb: 1.6393, applying: true },
    { date: "2024-03-20T12:00:00Z", bodyA: "Jupiter", bodyB: "Uranus", aspect: "conjunction", orb: 5.3090, applying: true },
  ];

  it.each(cases)(
    "$bodyA-$bodyB on $date is $aspect, orb $orb, applying=$applying",
    ({ date, bodyA, bodyB, aspect, orb, applying }) => {
      const now = positionsAt(date);
      const later = positionsAt(oneDayLater(date).toISOString());
      const found = computeAspects(now, later).find(
        (a) =>
          (a.bodyA === bodyA && a.bodyB === bodyB) || (a.bodyA === bodyB && a.bodyB === bodyA)
      );

      expect(found).toBeDefined();
      expect(found!.aspect).toBe(aspect);
      expect(found!.orb).toBeGreaterThanOrEqual(0);
      expect(Math.abs(found!.orb - orb)).toBeLessThan(TOLERANCE_DEG);
      expect(found!.applying).toBe(applying);
    }
  );

  it("confirms Pluto is actually retrograde in the 1850 reference case", () => {
    const positions = positionsAt("1850-01-01T00:00:00Z");
    const pluto = positions.find((p) => p.body === "Pluto");
    expect(pluto?.retrograde).toBe(true);
  });

  it("does not report an aspect that isn't there (Sun-Moon, 2024-03-20)", () => {
    const now = positionsAt("2024-03-20T12:00:00Z");
    const later = positionsAt(oneDayLater("2024-03-20T12:00:00Z").toISOString());
    const found = computeAspects(now, later).find(
      (a) =>
        (a.bodyA === "Sun" && a.bodyB === "Moon") || (a.bodyA === "Moon" && a.bodyB === "Sun")
    );
    expect(found).toBeUndefined();
  });
});

describe("computeAspects mechanics (R2, R4)", () => {
  it("returns results sorted by ascending orb, tightest first", () => {
    const now = positionsAt("1850-01-01T00:00:00Z");
    const later = positionsAt(oneDayLater("1850-01-01T00:00:00Z").toISOString());
    const results = computeAspects(now, later);
    expect(results.length).toBeGreaterThan(1);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].orb).toBeGreaterThanOrEqual(results[i - 1].orb);
    }
  });

  it("exposes tightness as 1 - orb/maxOrb", () => {
    const now = positionsAt("1850-01-01T00:00:00Z");
    const later = positionsAt(oneDayLater("1850-01-01T00:00:00Z").toISOString());
    const results = computeAspects(now, later);
    const uranusPluto = results.find(
      (a) =>
        (a.bodyA === "Uranus" && a.bodyB === "Pluto") ||
        (a.bodyA === "Pluto" && a.bodyB === "Uranus")
    )!;
    // Conjunction's maxOrb is 8.
    expect(uranusPluto.tightness).toBeCloseTo(1 - uranusPluto.orb / 8, 6);
  });

  it("keeps only one aspect per pair", () => {
    const now = positionsAt("1950-06-15T00:00:00Z");
    const later = positionsAt(oneDayLater("1950-06-15T00:00:00Z").toISOString());
    const results = computeAspects(now, later);
    const pairKeys = results.map((a) => [a.bodyA, a.bodyB].sort().join("-"));
    expect(new Set(pairKeys).size).toBe(pairKeys.length);
  });
});
