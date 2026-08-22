import {
  assertDateInSupportedRange,
  calculationInstantForDate,
  type PlanetPosition,
} from "../ephemeris/adapter";
import { computeAspects, type Aspect } from "../ephemeris/aspects";
import { countElements, countModalities, type Element, type Modality } from "../ephemeris/balance";
import { julianDay } from "../ephemeris/julian-day";
import { computeMoonPhase, type MoonPhase } from "../ephemeris/moon-phase";

/**
 * PRD v2 §2.3. Isomorphic (R6) -- no node: import, no server-only -- since
 * this is read in the browser exactly as the rest of lib/ephemeris/ is.
 */

export type ChartModel = {
  date: string; // ISO date -- the reading's event_date
  julianDay: number;
  positions: PlanetPosition[];
  aspects: Aspect[]; // sorted tightest first
  elements: Record<Element, number>;
  modalities: Record<Modality, number>;
  moonPhase: MoonPhase;
};

/**
 * Composes from PERSISTED positions rather than recomputing them (R4), so
 * a stored reading and a fresh calculation produce an identical model, and
 * a saved reading can never silently disagree with the row it came from.
 *
 * Known consequence of that rule, not an oversight: computeAspects's
 * `applying` flag needs a second position snapshot (~1 day later, per
 * lib/ephemeris/aspects.ts) to mean anything, and there is no such
 * snapshot here -- getting one would mean calling computePositions, which
 * R4 forbids outright. This calls computeAspects(positions, positions)
 * instead, which reuses the same tested orb/tightness/sort logic (those
 * fields match docs/design/CHART_MODEL.md's fixture exactly) but makes
 * `applying` mechanically always false: orbLater is computed from the same
 * snapshot as orbNow, so orbLater < orbNow can never hold. Confirmed
 * against QA1's own note in CHART_MODEL.md that nothing renders `applying`
 * yet -- but Sprint 17's prompt template does plan to, so whoever wires
 * that up needs a real second snapshot from somewhere and should not
 * assume this flag is meaningful before then.
 */
export function composeChart(date: string, positions: PlanetPosition[]): ChartModel {
  const instant = calculationInstantForDate(date); // validates format (round-trips the calendar date)
  assertDateInSupportedRange(instant); // R5: 1700-01-01..2100-12-31, with adapter.ts's own clear message

  return {
    date,
    julianDay: julianDay(instant),
    positions,
    aspects: computeAspects(positions, positions),
    elements: countElements(positions),
    modalities: countModalities(positions),
    moonPhase: computeMoonPhase(positions),
  };
}

export type DateEvent = {
  year: number;
  text: string;
  sourceUrl?: string;
};

export type ReadingModel = {
  id: string;
  chart: ChartModel;
  events: DateEvent[];
  horoscope: string | null;
};
