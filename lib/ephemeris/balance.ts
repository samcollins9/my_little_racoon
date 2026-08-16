import type { PlanetPosition } from "./adapter";
import type { ZodiacSign } from "./zodiac";

export const ELEMENTS = ["Fire", "Earth", "Air", "Water"] as const;
export type Element = (typeof ELEMENTS)[number];

export const MODALITIES = ["Cardinal", "Fixed", "Mutable"] as const;
export type Modality = (typeof MODALITIES)[number];

const ELEMENT_BY_SIGN: Record<ZodiacSign, Element> = {
  Aries: "Fire",
  Leo: "Fire",
  Sagittarius: "Fire",
  Taurus: "Earth",
  Virgo: "Earth",
  Capricorn: "Earth",
  Gemini: "Air",
  Libra: "Air",
  Aquarius: "Air",
  Cancer: "Water",
  Scorpio: "Water",
  Pisces: "Water",
};

const MODALITY_BY_SIGN: Record<ZodiacSign, Modality> = {
  Aries: "Cardinal",
  Cancer: "Cardinal",
  Libra: "Cardinal",
  Capricorn: "Cardinal",
  Taurus: "Fixed",
  Leo: "Fixed",
  Scorpio: "Fixed",
  Aquarius: "Fixed",
  Gemini: "Mutable",
  Virgo: "Mutable",
  Sagittarius: "Mutable",
  Pisces: "Mutable",
};

function zeroCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export function countElements(positions: PlanetPosition[]): Record<Element, number> {
  const counts = zeroCounts(ELEMENTS);
  for (const position of positions) {
    counts[ELEMENT_BY_SIGN[position.sign]] += 1;
  }
  return counts;
}

export function countModalities(positions: PlanetPosition[]): Record<Modality, number> {
  const counts = zeroCounts(MODALITIES);
  for (const position of positions) {
    counts[MODALITY_BY_SIGN[position.sign]] += 1;
  }
  return counts;
}
