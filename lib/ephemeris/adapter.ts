import * as Astronomy from "astronomy-engine";
import { zodiacPositionFromLongitude, type ZodiacSign } from "./zodiac";

/**
 * This project's own interface onto astronomy-engine (Sprint 6, R1).
 * This is the only module that imports astronomy-engine -- callers use
 * PlanetName/PlanetPosition, never Astronomy.Body or its other types
 * directly, so the library stays swappable behind this one file.
 */
export const PLANET_NAMES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
] as const;

export type PlanetName = (typeof PLANET_NAMES)[number];

export type PlanetPosition = {
  body: PlanetName;
  eclipticLongitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  retrograde: boolean;
};

export class DateInputError extends Error {}

export class InvalidDateFormatError extends DateInputError {}

export class UnsupportedDateRangeError extends DateInputError {}

// R4: the stated supported range, enforced below, not just documented.
export const MIN_SUPPORTED_DATE = new Date("1700-01-01T00:00:00Z");
export const MAX_SUPPORTED_DATE = new Date("2100-12-31T23:59:59Z");

export function assertDateInSupportedRange(date: Date): void {
  if (date < MIN_SUPPORTED_DATE || date > MAX_SUPPORTED_DATE) {
    throw new UnsupportedDateRangeError(
      `Date must be between ${MIN_SUPPORTED_DATE.toISOString().slice(0, 10)} and ` +
        `${MAX_SUPPORTED_DATE.toISOString().slice(0, 10)}.`
    );
  }
}

// R5: the calculation instant is this fixed, named, documented hour --
// not "now", not the request time. Every date gets its positions computed
// at this same hour UTC, and the page states that plainly rather than
// implying a precision ("the moment you were born") it doesn't have.
export const CALCULATION_HOUR_UTC = 12;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function calculationInstantForDate(isoDate: string): Date {
  if (!DATE_ONLY_PATTERN.test(isoDate)) {
    throw new InvalidDateFormatError(`"${isoDate}" is not a date in YYYY-MM-DD form.`);
  }

  const hour = String(CALCULATION_HOUR_UTC).padStart(2, "0");
  const instant = new Date(`${isoDate}T${hour}:00:00Z`);

  // JS's Date parser silently rolls an invalid day-of-month forward
  // (2024-02-30 becomes 2024-03-01) instead of rejecting it -- exactly
  // the "silently mis-cast" failure R4 exists to prevent, not just an
  // out-of-range date. Round-tripping catches it: if what we parsed back
  // out doesn't match what was typed in, the input wasn't a real date.
  const [year, month, day] = isoDate.split("-").map(Number);
  const roundTrips =
    instant.getUTCFullYear() === year &&
    instant.getUTCMonth() + 1 === month &&
    instant.getUTCDate() === day;

  if (Number.isNaN(instant.getTime()) || !roundTrips) {
    throw new InvalidDateFormatError(`"${isoDate}" is not a valid calendar date.`);
  }

  return instant;
}

function eclipticLongitude(body: Astronomy.Body, date: Date): number {
  const vector = Astronomy.GeoVector(body, date, true);
  return Astronomy.Ecliptic(vector).elon;
}

// A one-day forward difference. The Sun and Moon never actually go
// retrograde as seen from Earth (Earth doesn't orbit either of them), so
// this naturally reports false for both without needing a special case --
// their longitude only ever increases.
const RETROGRADE_STEP_DAYS = 1;

function isRetrograde(body: Astronomy.Body, date: Date): boolean {
  const lonNow = eclipticLongitude(body, date);
  const later = new Date(date.getTime() + RETROGRADE_STEP_DAYS * 24 * 60 * 60 * 1000);
  const lonLater = eclipticLongitude(body, later);
  const signedDelta = ((lonLater - lonNow + 540) % 360) - 180;
  return signedDelta < 0;
}

/**
 * Deterministic and side-effect free (R6): every value here is a pure
 * function of `date`. No clock read, no network call, no random source.
 */
export function computePositions(date: Date): PlanetPosition[] {
  assertDateInSupportedRange(date);

  return PLANET_NAMES.map((name) => {
    const body = Astronomy.Body[name];
    const eclipticLon = eclipticLongitude(body, date);
    const { sign, degreeInSign } = zodiacPositionFromLongitude(eclipticLon);

    return {
      body: name,
      eclipticLongitude: eclipticLon,
      sign,
      degreeInSign,
      retrograde: isRetrograde(body, date),
    };
  });
}
