import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertDateInSupportedRange,
  calculationInstantForDate,
  computePositions,
  type PlanetPosition,
} from "../ephemeris/adapter";
import { computeAspects, type Aspect } from "../ephemeris/aspects";
import { composeChart, type ReadingModel } from "../chart/model";
import type { WikipediaEventsPayload } from "../events/wikipedia";
import { generateHoroscope } from "./horoscope";

/**
 * R6: absent, or any value other than an explicit disable, means enabled
 * -- the feature cannot ship silently off. "false" (any case) is the one
 * explicit disable value; everything else, including a typo, is enabled.
 */
export function isHoroscopeEnabled(
  source: Record<string, string | undefined> = process.env
): boolean {
  return source.HOROSCOPE_ENABLED?.trim().toLowerCase() !== "false";
}

// Same one-day convention as lib/ephemeris/adapter.ts's own retrograde
// check (RETROGRADE_STEP_DAYS) and the method CHART_MODEL.md's original
// Application column was generated with, before Sprint 15's composeChart
// made `applying` structurally false.
const APPLYING_SNAPSHOT_STEP_MS = 24 * 60 * 60 * 1000;

/**
 * composeChart(positions, positions) -- Sprint 15's R4 -- makes every
 * aspect's `applying` structurally false (lib/chart/model.ts,
 * docs/design/CHART_MODEL.md). Correct for the persisted chart: R4 forbids
 * computePositions inside composeChart specifically so a displayed chart
 * can never disagree with its own stored row. Wrong for a prompt that's
 * about to assert "applying" or "separating" as fact to an LLM instructed
 * not to hedge.
 *
 * This recomputes a real one-day-later snapshot purely to derive accurate
 * applying flags for the prompt -- never displayed, never stored, so it
 * cannot create the disagreement R4 exists to prevent. R4 scopes
 * composeChart itself, not every caller; CHART_MODEL.md names this sprint
 * as the one that needs a real second snapshot from somewhere, this is it.
 *
 * Sprint 18, R7: near MAX_SUPPORTED_DATE the later snapshot itself falls
 * outside the supported range, and computePositions would throw past this
 * function, past generateAndPersistHoroscope, into a framework error page
 * -- worse than every other failure here, which surfaces as an inline
 * message. Falls back to `fallback` (the caller's own composeChart
 * aspects) instead: a real, renderable answer, chosen deliberately over
 * catching the throw, because catching would return "try again", which is
 * wrong for a date that will never work no matter how many times it's
 * retried.
 */
export function computePromptAspects(
  eventDate: string,
  positions: PlanetPosition[],
  fallback: Aspect[]
): Aspect[] {
  const instant = calculationInstantForDate(eventDate);
  const later = new Date(instant.getTime() + APPLYING_SNAPSHOT_STEP_MS);

  try {
    assertDateInSupportedRange(later);
  } catch {
    return fallback;
  }

  const positionsLater = computePositions(later);
  return computeAspects(positions, positionsLater);
}

export type StoredReadingForGeneration = {
  id: string;
  event_date: string;
  positions: PlanetPosition[];
  events: WikipediaEventsPayload | null;
  horoscope: string | null;
};

function buildReadingModel(reading: StoredReadingForGeneration): ReadingModel {
  const chart = composeChart(reading.event_date, reading.positions);
  return {
    id: reading.id,
    // Prompt-accurate aspects, not composeChart's own -- see
    // computePromptAspects's comment for why this is scoped here rather
    // than inside composeChart.
    chart: {
      ...chart,
      aspects: computePromptAspects(reading.event_date, reading.positions, chart.aspects),
    },
    events: reading.events?.events ?? [],
    horoscope: reading.horoscope,
  };
}

export type GenerateResult = { ok: true } | { ok: false; error: string };

/**
 * The testable core of the generate/regenerate path, separated from the
 * "use server" boundary (app/reading/[id]/actions.ts) the same way
 * lib/chart/model.ts's composeChart is separated from app/chart/actions.ts
 * -- a plain function with injected dependencies is directly unit
 * testable; a "use server" export is not.
 *
 * R8: no write happens unless generateHoroscope succeeds. A thrown error
 * from generateHoroscope (network, timeout, malformed response) or from
 * the RPC call both leave the stored reading untouched -- there is no
 * partial-write path here to guard against, only ordering.
 */
export async function generateAndPersistHoroscope(
  anon: SupabaseClient,
  readingId: string,
  reading: StoredReadingForGeneration
): Promise<GenerateResult> {
  if (!isHoroscopeEnabled()) {
    return { ok: false, error: "Horoscope generation is currently disabled." };
  }

  const readingModel = buildReadingModel(reading);

  let text: string;
  let model: string;
  try {
    ({ text, model } = await generateHoroscope(readingModel));
  } catch (err) {
    // R5 (Sprint 18, carried from Sprint 17 note 2): the user-facing
    // message stays generic -- R8 still requires the swallow -- but this
    // failure often carries a quota, rate-limit, or billing reason that's
    // only diagnosable from Vercel's logs, not from what the user sees.
    console.error("generateAndPersistHoroscope: generateHoroscope failed", err);
    return { ok: false, error: "Horoscope generation failed, try again." };
  }

  const { data, error } = await anon.rpc("set_reading_horoscope", {
    reading_id: readingId,
    horoscope: text,
    model,
  });

  if (error || !data) {
    return { ok: false, error: "Could not save the horoscope, try again." };
  }

  return { ok: true };
}
