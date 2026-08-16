import { describe, expect, it } from "vitest";
import type { PlanetPosition } from "../../lib/ephemeris/adapter";
import {
  STAR_FIELD,
  computeBodies,
  computeMoonPhaseGeometry,
  computeSectors,
} from "./constellation";

function position(overrides: Partial<PlanetPosition> = {}): PlanetPosition {
  return {
    body: "Sun",
    eclipticLongitude: 0,
    sign: "Aries",
    degreeInSign: 0,
    retrograde: false,
    ...overrides,
  };
}

describe("STAR_FIELD", () => {
  it("is exactly 110 stars", () => {
    expect(STAR_FIELD).toHaveLength(110);
  });

  it("is deterministic -- the seeded LCG produces the same first star every time", () => {
    // Computed independently from the same seed (20260816) and formula.
    expect(STAR_FIELD[0].x).toBeCloseTo(160.0847, 3);
    expect(STAR_FIELD[0].y).toBeCloseTo(149.7287, 3);
  });

  it("every star falls within the documented radius band", () => {
    for (const star of STAR_FIELD) {
      const r = Math.hypot(star.x - 320, star.y - 320);
      expect(r).toBeGreaterThanOrEqual(40);
      expect(r).toBeLessThanOrEqual(308);
    }
  });
});

describe("computeBodies", () => {
  it("places 0 Aries at the left edge of the wheel (angle mapping: 180 - lon)", () => {
    const [sun] = computeBodies([position({ body: "Sun", eclipticLongitude: 0 })]);
    // ring 1 (Sun) -> r = 78 + 22 = 100; angle (180-0)=180 degrees -> (-1, 0) direction.
    expect(sun.x).toBeCloseTo(320 - 100, 6);
    expect(sun.y).toBeCloseTo(320, 6);
  });

  it("colours a retrograde planet rust, a direct planet verdigris, luminaries gold", () => {
    const [mercuryRetro, mercuryDirect, moon] = computeBodies([
      position({ body: "Mercury", retrograde: true }),
      position({ body: "Venus", retrograde: false }),
      position({ body: "Moon" }),
    ]);
    expect(mercuryRetro.color).toBe("oklch(0.74 0.11 25)");
    expect(mercuryDirect.color).toBe("oklch(0.80 0.05 145)");
    expect(moon.color).toBe("oklch(0.88 0.06 85)");
  });

  it("formats the degree/minute label and appends the retrograde glyph", () => {
    const [body] = computeBodies([
      position({ degreeInSign: 12.5, sign: "Gemini", retrograde: true }),
    ]);
    expect(body.label).toBe("12°30' ♊  ℞");
  });
});

describe("computeSectors", () => {
  it("marks a sign occupied only when a body is actually in it", () => {
    const bodies = computeBodies([position({ body: "Sun", sign: "Leo" })]);
    const sectors = computeSectors(bodies);
    const leo = sectors.find((s) => s.sign === "Leo")!;
    const virgo = sectors.find((s) => s.sign === "Virgo")!;
    expect(leo.occupied).toBe(true);
    expect(virgo.occupied).toBe(false);
  });
});

describe("computeMoonPhaseGeometry", () => {
  it("full moon draws the outer semicircle with the full radius on both arcs", () => {
    const positions = [
      position({ body: "Sun", eclipticLongitude: 0 }),
      position({ body: "Moon", eclipticLongitude: 180 }),
    ];
    const { path, phaseName } = computeMoonPhaseGeometry(positions);
    expect(phaseName).toBe("Full");
    // At elongation 180, k = cos(180deg) = -1, so the terminator radius
    // is |k|*r = r -- a true full circle, not a crescent/gibbous curve.
    expect(path).toContain("A 11 11 0 0");
  });

  it("new moon is waning-adjacent geometry, not full", () => {
    const positions = [
      position({ body: "Sun", eclipticLongitude: 0 }),
      position({ body: "Moon", eclipticLongitude: 2 }),
    ];
    const { phaseName } = computeMoonPhaseGeometry(positions);
    expect(phaseName).toBe("New");
  });
});
