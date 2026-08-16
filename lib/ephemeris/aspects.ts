import { PLANET_NAMES, type PlanetName, type PlanetPosition } from "./adapter";

export const ASPECT_NAMES = ["conjunction", "opposition", "trine", "square", "sextile"] as const;
export type AspectName = (typeof ASPECT_NAMES)[number];

export type Aspect = {
  bodyA: PlanetName;
  bodyB: PlanetName;
  aspect: AspectName;
  orb: number;
  tightness: number;
  applying: boolean;
};

/**
 * The handoff's exact orb table (docs/design/HANDOFF_chart_constellation.md).
 * Order matters: checked in this order per pair, first match wins (R2).
 * The ranges don't actually overlap at these values, so order doesn't
 * change which aspect a pair gets -- it's what makes "first match" a
 * well-defined, checkable rule rather than an implicit tie-break.
 */
const ASPECT_DEFINITIONS: { name: AspectName; angle: number; maxOrb: number }[] = [
  { name: "conjunction", angle: 0, maxOrb: 8 },
  { name: "opposition", angle: 180, maxOrb: 8 },
  { name: "trine", angle: 120, maxOrb: 7 },
  { name: "square", angle: 90, maxOrb: 7 },
  { name: "sextile", angle: 60, maxOrb: 4 },
];

/** Shortest circular distance between two longitudes, in [0, 180]. */
function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function positionsByBody(positions: PlanetPosition[]): Map<PlanetName, PlanetPosition> {
  return new Map(positions.map((p) => [p.body, p]));
}

/**
 * R3: applying/separating from the *actual* motion of both bodies, not
 * assumed from whichever is nominally faster. `positionsLater` must be
 * real recomputed positions at a later instant (the caller decides how
 * much later -- see lib/ephemeris/adapter.ts's own RETROGRADE_STEP_DAYS
 * for the convention used elsewhere in this codebase), not an
 * extrapolation. A rule keyed on one body's typical speed gets this wrong
 * exactly when the other body is retrograde, which is also the case the
 * design colours in rust -- the error would land on the marks a user
 * looks at first.
 */
export function computeAspects(
  positionsNow: PlanetPosition[],
  positionsLater: PlanetPosition[]
): Aspect[] {
  const nowByBody = positionsByBody(positionsNow);
  const laterByBody = positionsByBody(positionsLater);
  const results: Aspect[] = [];

  for (let i = 0; i < PLANET_NAMES.length; i++) {
    for (let j = i + 1; j < PLANET_NAMES.length; j++) {
      const bodyA = PLANET_NAMES[i];
      const bodyB = PLANET_NAMES[j];
      const a = nowByBody.get(bodyA);
      const b = nowByBody.get(bodyB);
      const aLater = laterByBody.get(bodyA);
      const bLater = laterByBody.get(bodyB);
      if (!a || !b || !aLater || !bLater) continue;

      const sepNow = angularSeparation(a.eclipticLongitude, b.eclipticLongitude);

      for (const def of ASPECT_DEFINITIONS) {
        const orbNow = Math.abs(sepNow - def.angle);
        if (orbNow > def.maxOrb) continue;

        const sepLater = angularSeparation(aLater.eclipticLongitude, bLater.eclipticLongitude);
        const orbLater = Math.abs(sepLater - def.angle);

        results.push({
          bodyA,
          bodyB,
          aspect: def.name,
          orb: orbNow,
          tightness: 1 - orbNow / def.maxOrb,
          applying: orbLater < orbNow,
        });
        break; // R2: first match only.
      }
    }
  }

  // R2: sorted by ascending orb, tightest first.
  return results.sort((x, y) => x.orb - y.orb);
}
