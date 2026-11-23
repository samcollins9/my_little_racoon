import { describe, expect, it } from "vitest";
import { PLANET_NAMES, type PlanetPosition } from "../../../lib/ephemeris/adapter";
import { ZODIAC_SIGNS } from "../../../lib/ephemeris/zodiac";
import {
  STAR_FIELD,
  computeBodies,
  computeMoonPhaseGeometry,
  computeSectors,
  degreesAndMinutes,
  planetTooltip,
  sectorTooltip,
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
    const { path, phaseName } = computeMoonPhaseGeometry(positions, 15, 15, 11);
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
    const { phaseName } = computeMoonPhaseGeometry(positions, 15, 15, 11);
    expect(phaseName).toBe("New");
  });

  it("draws around whatever centre/radius the caller passes, not a hardcoded figure placement", () => {
    const positions = [
      position({ body: "Sun", eclipticLongitude: 0 }),
      position({ body: "Moon", eclipticLongitude: 180 }),
    ];
    const { path } = computeMoonPhaseGeometry(positions, 100, 200, 5);
    expect(path).toContain("M 100 195");
    expect(path).toContain("A 5 5 0 0");
  });
});

// ---------------------------------------------------------------------------
// Sprint 34: native SVG tooltip text (R1-R3, tested per R5).

describe("degreesAndMinutes (R1: floored, never rounded)", () => {
  it.each([
    [0, 0, 0],
    [12.5667, 12, 34],
    [29.9999, 29, 59],
    [29.999, 29, 59],
    [12.5, 12, 30],
    [7.0166667, 7, 1],
  ])("%d -> %d°%d′", (input, degrees, minutes) => {
    expect(degreesAndMinutes(input)).toEqual({ degrees, minutes });
  });

  it("can never produce 60 minutes or 30 degrees, even from the largest double below 30", () => {
    const justUnder30 = 30 - Number.EPSILON * 16;
    expect(justUnder30).toBeLessThan(30);
    expect(degreesAndMinutes(justUnder30)).toEqual({ degrees: 29, minutes: 59 });
    for (let tenths = 0; tenths < 300; tenths++) {
      const { degrees, minutes } = degreesAndMinutes(tenths / 10 + 0.0999999);
      expect(degrees).toBeLessThanOrEqual(29);
      expect(minutes).toBeLessThanOrEqual(59);
    }
  });
});

describe("planetTooltip (R1)", () => {
  it("names the planet, its sign and its degree, with two-digit minutes", () => {
    expect(planetTooltip(position({ body: "Mars", sign: "Aries", degreeInSign: 12.5667 }))).toBe(
      "Mars in Aries 12°34′"
    );
    expect(planetTooltip(position({ body: "Venus", sign: "Libra", degreeInSign: 0 }))).toBe(
      "Venus in Libra 0°00′"
    );
    expect(planetTooltip(position({ body: "Pluto", sign: "Capricorn", degreeInSign: 29.9999 }))).toBe(
      "Pluto in Capricorn 29°59′"
    );
  });

  it("appends \", retrograde\" only when the planet is retrograde", () => {
    expect(planetTooltip(position({ body: "Mars", sign: "Aries", degreeInSign: 12.5667, retrograde: true }))).toBe(
      "Mars in Aries 12°34′, retrograde"
    );
    expect(planetTooltip(position({ body: "Mars", retrograde: false }))).not.toMatch(/retrograde/);
  });

  it("never calls the Sun or the Moon retrograde, even if the record says so", () => {
    expect(planetTooltip(position({ body: "Sun", retrograde: true }))).toBe("Sun in Aries 0°00′");
    expect(planetTooltip(position({ body: "Moon", retrograde: true }))).toBe("Moon in Aries 0°00′");
  });

  it("spells every planet and sign exactly as the app's own name lists do", () => {
    for (const body of PLANET_NAMES) {
      for (const sign of ZODIAC_SIGNS) {
        expect(planetTooltip(position({ body, sign, degreeInSign: 3.25 }))).toBe(`${body} in ${sign} 3°15′`);
      }
    }
  });

  it("matches the chart label's degree and minute for the same position", () => {
    for (const degreeInSign of [0, 4.016, 12.5667, 17.35, 29.9999]) {
      const [body] = computeBodies([position({ body: "Mars", sign: "Leo", degreeInSign })]);
      const [, labelDeg, labelMin] = body.label.match(/^(\d+)°(\d+)'/)!;
      const [, tipDeg, tipMin] = body.tooltip.match(/ (\d+)°(\d+)′/)!;
      expect(Number(tipDeg)).toBe(Number(labelDeg));
      expect(tipMin).toBe(labelMin);
    }
  });

  it("computeBodies carries it as each body's tooltip", () => {
    const [mars] = computeBodies([position({ body: "Mars", sign: "Aries", degreeInSign: 12.5667, retrograde: true })]);
    expect(mars.tooltip).toBe("Mars in Aries 12°34′, retrograde");
  });
});

describe("sectorTooltip (R2)", () => {
  // Written out independently of lib/ephemeris/balance.ts's tables, so this
  // checks them rather than restating them.
  const EXPECTED: Record<(typeof ZODIAC_SIGNS)[number], string> = {
    Aries: "Aries: Fire, Cardinal",
    Taurus: "Taurus: Earth, Fixed",
    Gemini: "Gemini: Air, Mutable",
    Cancer: "Cancer: Water, Cardinal",
    Leo: "Leo: Fire, Fixed",
    Virgo: "Virgo: Earth, Mutable",
    Libra: "Libra: Air, Cardinal",
    Scorpio: "Scorpio: Water, Fixed",
    Sagittarius: "Sagittarius: Fire, Mutable",
    Capricorn: "Capricorn: Earth, Cardinal",
    Aquarius: "Aquarius: Air, Fixed",
    Pisces: "Pisces: Water, Mutable",
  };

  it.each(ZODIAC_SIGNS)("%s has the right element and modality", (sign) => {
    expect(sectorTooltip(sign)).toBe(EXPECTED[sign]);
  });

  it("computeSectors carries it for all twelve sectors, in wheel order", () => {
    const sectors = computeSectors([]);
    expect(sectors.map((s) => s.tooltip)).toEqual(ZODIAC_SIGNS.map((sign) => EXPECTED[sign]));
  });
});
