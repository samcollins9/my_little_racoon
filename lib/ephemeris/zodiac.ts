export const ZODIAC_SIGNS = [
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
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export type ZodiacPosition = {
  sign: ZodiacSign;
  degreeInSign: number;
};

/**
 * Tropical zodiac, 12 signs of 30 degrees each starting at 0 degrees =
 * 0 Aries. No sidereal/ayanamsa adjustment -- out of scope for this
 * sprint (see the sprint file's Out of Scope section).
 */
export function zodiacPositionFromLongitude(eclipticLongitudeDeg: number): ZodiacPosition {
  const normalized = ((eclipticLongitudeDeg % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  return {
    sign: ZODIAC_SIGNS[signIndex],
    degreeInSign: normalized - signIndex * 30,
  };
}
