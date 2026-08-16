import { describe, expect, it } from "vitest";
import { countElements, countModalities } from "./balance";
import type { PlanetPosition } from "./adapter";

function fixturePosition(body: string, sign: PlanetPosition["sign"]): PlanetPosition {
  return {
    body: body as PlanetPosition["body"],
    eclipticLongitude: 0,
    sign,
    degreeInSign: 0,
    retrograde: false,
  };
}

describe("countElements", () => {
  it("all ten in Aries counts ten Fire and zero everywhere else", () => {
    const positions = Array.from({ length: 10 }, (_, i) => fixturePosition(`Body${i}`, "Aries"));
    expect(countElements(positions)).toEqual({ Fire: 10, Earth: 0, Air: 0, Water: 0 });
  });

  it("one sign per element sums correctly across the triplicity", () => {
    const positions = [
      fixturePosition("A", "Aries"), // Fire
      fixturePosition("B", "Leo"), // Fire
      fixturePosition("C", "Taurus"), // Earth
      fixturePosition("D", "Gemini"), // Air
      fixturePosition("E", "Cancer"), // Water
    ];
    expect(countElements(positions)).toEqual({ Fire: 2, Earth: 1, Air: 1, Water: 1 });
  });
});

describe("countModalities", () => {
  it("one sign per modality across the quadruplicity", () => {
    const positions = [
      fixturePosition("A", "Aries"), // Cardinal
      fixturePosition("B", "Capricorn"), // Cardinal
      fixturePosition("C", "Taurus"), // Fixed
      fixturePosition("D", "Gemini"), // Mutable
    ];
    expect(countModalities(positions)).toEqual({ Cardinal: 2, Fixed: 1, Mutable: 1 });
  });

  it("every sign is classified -- twelve fixtures sum to twelve", () => {
    const signs: PlanetPosition["sign"][] = [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ];
    const positions = signs.map((sign, i) => fixturePosition(`Body${i}`, sign));
    const modalities = countModalities(positions);
    const total = modalities.Cardinal + modalities.Fixed + modalities.Mutable;
    expect(total).toBe(12);
    expect(modalities).toEqual({ Cardinal: 4, Fixed: 4, Mutable: 4 });
  });
});
