import type { PlanetPosition } from "./adapter";

export const PHASE_NAMES = [
  "New",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
] as const;
export type PhaseName = (typeof PHASE_NAMES)[number];

export type MoonPhase = {
  elongation: number;
  waxing: boolean;
  phaseName: PhaseName;
};

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/**
 * Phase name bands from the design handoff, deliberately narrow at the
 * cardinal points (10 degrees either side of new/full, 20 either side of
 * the quarters) rather than each spanning a full quarter -- most of the
 * cycle is a gibbous or crescent, not one of the four named instants.
 */
function phaseNameFromElongation(elongation: number): PhaseName {
  if (elongation < 10 || elongation >= 350) return "New";
  if (elongation < 80) return "Waxing crescent";
  if (elongation < 100) return "First quarter";
  if (elongation < 170) return "Waxing gibbous";
  if (elongation < 190) return "Full";
  if (elongation < 260) return "Waning gibbous";
  if (elongation < 280) return "Last quarter";
  return "Waning crescent";
}

export function computeMoonPhase(positions: PlanetPosition[]): MoonPhase {
  const sun = positions.find((p) => p.body === "Sun");
  const moon = positions.find((p) => p.body === "Moon");
  if (!sun || !moon) {
    throw new Error("computeMoonPhase requires both Sun and Moon in positions");
  }

  const elongation = normalizeDegrees(moon.eclipticLongitude - sun.eclipticLongitude);

  return {
    elongation,
    waxing: elongation < 180,
    phaseName: phaseNameFromElongation(elongation),
  };
}
