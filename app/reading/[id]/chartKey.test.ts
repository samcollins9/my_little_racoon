import { describe, expect, it } from "vitest";
import { composeChart } from "@/lib/chart/model";
import { PLANET_NAMES, calculationInstantForDate, computePositions, type PlanetPosition } from "@/lib/ephemeris/adapter";
import { ASPECT_NAMES, type Aspect } from "@/lib/ephemeris/aspects";
import { ZODIAC_SIGNS, zodiacPositionFromLongitude } from "@/lib/ephemeris/zodiac";
import { aspectKeyRows, aspectRows, planetRows, signRows } from "./chartKey";
import {
  ASPECT_BASE_WIDTH,
  ASPECT_COLOR,
  ASPECT_DASH,
  computeBodies,
  computeSectors,
  planetTooltip,
} from "./constellation";

// Sprint 37, R9: the data behind each key table, checked against the chart's
// own output for the same positions -- the point of the key is that it can
// never disagree with the chart it explains.

const DATE = "1969-07-20";
const realPositions = () => computePositions(calculationInstantForDate(DATE));

/** A position at an ecliptic longitude, with its sign and degree derived the adapter's way. */
function at(body: PlanetPosition["body"], longitude: number, retrograde = false): PlanetPosition {
  const { sign, degreeInSign } = zodiacPositionFromLongitude(longitude);
  return { body, eclipticLongitude: longitude, sign, degreeInSign, retrograde };
}

describe("planetRows (R3)", () => {
  it("one row per body, in the chart's own body order, Sun → Pluto", () => {
    const positions = realPositions();
    const rows = planetRows(positions);

    expect(rows.map((r) => r.planet.name)).toEqual([...PLANET_NAMES]);
    expect(rows.map((r) => r.planet.name)).toEqual(computeBodies(positions).map((b) => b.key));
  });

  it("each position is the chart label's own text, and agrees with the tooltip's degrees and minutes", () => {
    // Real positions plus the floor edge Sprint 34 pinned (29.9999° is 29°59′).
    const positions = [...realPositions().slice(0, 9), at("Pluto", 29.9999)];
    const bodies = computeBodies(positions);

    planetRows(positions).forEach((row, i) => {
      const body = bodies[i];
      expect(body.label.startsWith(`${row.position} `)).toBe(true);

      const [, degrees, minutes] = row.position.match(/^(\d{2})°(\d{2})'$/)!;
      expect(planetTooltip(positions[i])).toContain(
        `in ${row.sign.name} ${Number(degrees)}°${minutes}′`
      );
    });
    expect(planetRows(positions)[9].position).toBe("29°59'");
  });

  it("glyph and name pairs come from the chart's glyph tables", () => {
    const [mars] = planetRows([at("Mars", 12.5)]);

    expect(mars.planet).toEqual({ glyph: "♂", name: "Mars" });
    expect(mars.sign).toEqual({ glyph: "♈", name: "Aries" });
    expect(mars.planet.glyph).toBe(computeBodies([at("Mars", 12.5)])[0].glyph);
  });

  it("℞ follows the tooltip's rule: a retrograde planet shows it, the Sun and Moon never do", () => {
    const rows = planetRows([at("Sun", 10, true), at("Moon", 20, true), at("Mars", 30, true), at("Venus", 40)]);

    expect(rows.map((r) => r.retrograde)).toEqual([false, false, true, false]);
  });
});

describe("signRows (R4)", () => {
  it("twelve rows in zodiac order, with element and modality", () => {
    const rows = signRows(realPositions());

    expect(rows.map((r) => r.sign.name)).toEqual([...ZODIAC_SIGNS]);
    expect(rows[0]).toMatchObject({ sign: { glyph: "♈", name: "Aries" }, element: "Fire", modality: "Cardinal" });
    expect(rows[11]).toMatchObject({ sign: { glyph: "♓", name: "Pisces" }, element: "Water", modality: "Mutable" });
  });

  it("a sign holding several planets lists them all in chart order; an empty sign lists none", () => {
    const positions = [at("Sun", 5), at("Moon", 100), at("Mercury", 15), at("Venus", 25)];
    const rows = signRows(positions);
    const aries = rows.find((r) => r.sign.name === "Aries")!;
    const cancer = rows.find((r) => r.sign.name === "Cancer")!;
    const taurus = rows.find((r) => r.sign.name === "Taurus")!;

    expect(aries.planets.map((p) => p.name)).toEqual(["Sun", "Mercury", "Venus"]);
    expect(aries.occupied).toBe(true);
    expect(cancer.planets.map((p) => p.name)).toEqual(["Moon"]);
    expect(taurus.planets).toEqual([]);
    expect(taurus.occupied).toBe(false);
  });

  it("marks exactly the signs the chart highlights, and every planet appears in exactly one row", () => {
    const positions = realPositions();
    const rows = signRows(positions);

    expect(rows.map((r) => r.occupied)).toEqual(computeSectors(computeBodies(positions)).map((s) => s.occupied));
    expect(rows.flatMap((r) => r.planets.map((p) => p.name)).sort()).toEqual([...PLANET_NAMES].sort());
  });
});

describe("aspectKeyRows (R5a)", () => {
  it("the five aspect types with their angles, drawn with the chart's own line values", () => {
    const rows = aspectKeyRows();

    expect(rows.map((r) => r.aspect)).toEqual([...ASPECT_NAMES]);
    expect(rows.map((r) => [r.label, r.angle])).toEqual([
      ["Conjunction", "0°"],
      ["Opposition", "180°"],
      ["Trine", "120°"],
      ["Square", "90°"],
      ["Sextile", "60°"],
    ]);
    for (const row of rows) {
      expect(row.line).toEqual({
        color: ASPECT_COLOR[row.aspect],
        dash: ASPECT_DASH[row.aspect],
        width: ASPECT_BASE_WIDTH[row.aspect],
      });
    }
  });
});

describe("aspectRows (R5b)", () => {
  const aspect = (bodyA: Aspect["bodyA"], bodyB: Aspect["bodyB"], name: Aspect["aspect"], orb: number): Aspect => ({
    bodyA,
    bodyB,
    aspect: name,
    orb,
    tightness: 0,
    applying: false,
  });

  it("tightest orb first, even when the input isn't sorted, with orbs to one decimal", () => {
    const rows = aspectRows([
      aspect("Sun", "Mars", "square", 6.04),
      aspect("Moon", "Venus", "trine", 0.26),
      aspect("Mercury", "Saturn", "sextile", 3.95),
    ]);

    expect(rows.map((r) => r.orb)).toEqual(["0.3°", "4.0°", "6.0°"]);
    expect(rows[0]).toMatchObject({
      planetA: { glyph: "☽", name: "Moon" },
      planetB: { glyph: "♀", name: "Venus" },
      aspect: "trine",
      label: "Trine",
      line: { color: ASPECT_COLOR.trine, dash: ASPECT_DASH.trine, width: ASPECT_BASE_WIDTH.trine },
    });
  });

  it("is the same list, with the same line styles, the chart draws threads for", () => {
    const chart = composeChart(DATE, realPositions());
    const rows = aspectRows(chart.aspects);

    expect(rows).toHaveLength(chart.aspects.length);
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row, i) => {
      expect([row.planetA.name, row.planetB.name, row.aspect]).toEqual([
        chart.aspects[i].bodyA,
        chart.aspects[i].bodyB,
        chart.aspects[i].aspect,
      ]);
    });
  });

  it("no aspects: an empty list (the tab shows its empty line instead of a table)", () => {
    expect(aspectRows([])).toEqual([]);
  });
});
