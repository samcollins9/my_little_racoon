import { describe, expect, it } from "vitest";
import { computeMoonPhase } from "./moon-phase";
import type { PlanetPosition } from "./adapter";

// Sun pinned at longitude 0; Moon placed at the elongation under test, so
// (moon - sun) normalized is exactly the elongation -- lets every phase
// band boundary from the design handoff be hit precisely, which finding
// eight real calendar dates for could not do as exactly.
function fixtures(moonElongation: number): PlanetPosition[] {
  const base = { degreeInSign: 0, sign: "Aries" as const, retrograde: false };
  return [
    { ...base, body: "Sun", eclipticLongitude: 0 },
    { ...base, body: "Moon", eclipticLongitude: moonElongation },
  ];
}

describe("computeMoonPhase", () => {
  it("computes elongation as the normalized moon-minus-sun difference", () => {
    expect(computeMoonPhase(fixtures(47)).elongation).toBeCloseTo(47, 9);
  });

  it("waxing is true below 180 degrees elongation, false at and above", () => {
    expect(computeMoonPhase(fixtures(179.999)).waxing).toBe(true);
    expect(computeMoonPhase(fixtures(180)).waxing).toBe(false);
    expect(computeMoonPhase(fixtures(359.999)).waxing).toBe(false);
  });

  const bandCenters: Array<[number, string]> = [
    [5, "New"],
    [45, "Waxing crescent"],
    [90, "First quarter"],
    [130, "Waxing gibbous"],
    [180, "Full"],
    [220, "Waning gibbous"],
    [270, "Last quarter"],
    [320, "Waning crescent"],
  ];

  it.each(bandCenters)("elongation %s degrees is phase %s", (elongation, expected) => {
    expect(computeMoonPhase(fixtures(elongation)).phaseName).toBe(expected);
  });

  // The handoff specifies these bands as deliberately narrow at the
  // cardinal points -- exact boundary behavior is the part worth getting
  // precisely right, not just the middle of each band.
  it("boundaries match the handoff's bands exactly", () => {
    expect(computeMoonPhase(fixtures(9.999)).phaseName).toBe("New");
    expect(computeMoonPhase(fixtures(10)).phaseName).toBe("Waxing crescent");
    expect(computeMoonPhase(fixtures(79.999)).phaseName).toBe("Waxing crescent");
    expect(computeMoonPhase(fixtures(80)).phaseName).toBe("First quarter");
    expect(computeMoonPhase(fixtures(99.999)).phaseName).toBe("First quarter");
    expect(computeMoonPhase(fixtures(100)).phaseName).toBe("Waxing gibbous");
    expect(computeMoonPhase(fixtures(169.999)).phaseName).toBe("Waxing gibbous");
    expect(computeMoonPhase(fixtures(170)).phaseName).toBe("Full");
    expect(computeMoonPhase(fixtures(189.999)).phaseName).toBe("Full");
    expect(computeMoonPhase(fixtures(190)).phaseName).toBe("Waning gibbous");
    expect(computeMoonPhase(fixtures(259.999)).phaseName).toBe("Waning gibbous");
    expect(computeMoonPhase(fixtures(260)).phaseName).toBe("Last quarter");
    expect(computeMoonPhase(fixtures(279.999)).phaseName).toBe("Last quarter");
    expect(computeMoonPhase(fixtures(280)).phaseName).toBe("Waning crescent");
    expect(computeMoonPhase(fixtures(349.999)).phaseName).toBe("Waning crescent");
    expect(computeMoonPhase(fixtures(350)).phaseName).toBe("New");
  });

  it("throws if either Sun or Moon is missing from positions", () => {
    expect(() => computeMoonPhase([])).toThrow(/Sun and Moon/);
  });
});
