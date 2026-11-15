import type { SupabaseClient } from "@supabase/supabase-js";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import { fetchDayEvents, type WikipediaEventsPayload } from "../events/wikipedia";
import { generateAndPersistHoroscope, isHoroscopeEnabled } from "../llm/generate";
import { insertReading } from "../readings/insert";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "../supabase/availability";
import { lookupSavedHoroscope } from "./load";

export const CAST_DISABLED_MESSAGE = "Horoscope generation is currently disabled.";
export const CAST_UNAVAILABLE_MESSAGE =
  "The horoscope can't be written right now because the service is unavailable. Try again in a few minutes.";
export const CAST_SAVE_FAILED_MESSAGE = "Could not start the reading, try again.";

export type CastResult = { ok: true } | { ok: false; message: string };

type CastDeps = {
  fetchEvents: (isoDate: string) => Promise<WikipediaEventsPayload | null>;
  generate: typeof generateAndPersistHoroscope;
};

/**
 * R5: the only path in the date page that writes, reached only from the
 * "Write the horoscope" form's server action (app/date/[date]/actions.ts),
 * never from rendering. Kept out of the "use server" file so it's unit
 * testable with injected dependencies, the same split as
 * generateAndPersistHoroscope.
 *
 * Order matters:
 *   1. Generation disabled -> refuse before anything is written.
 *   2. A horoscope is already saved for the date -> nothing to do. Replacing
 *      one is out of scope; a stale tab or a hand-built POST mustn't do it.
 *      (Two casts racing each other can still both write; R4 shows the
 *      newer, which the sprint accepts.)
 *   3. Insert the reading -- positions and events, as /chart's saveReading
 *      does, through the same insertReading.
 *   4. Generate and persist through generateAndPersistHoroscope. If that
 *      fails the inserted row stays without a horoscope, which R4's lookup
 *      never returns.
 *
 * `isoDate` must already have passed parseDatePageParam.
 */
export async function castHoroscopeForDate(
  anon: SupabaseClient,
  isoDate: string,
  { fetchEvents, generate }: CastDeps = {
    fetchEvents: fetchDayEvents,
    generate: generateAndPersistHoroscope,
  }
): Promise<CastResult> {
  if (!isHoroscopeEnabled()) {
    return { ok: false, message: CAST_DISABLED_MESSAGE };
  }

  const existing = await lookupSavedHoroscope(anon, isoDate, "castHoroscopeForDate (lookup)");
  if (existing.kind === "unavailable") return { ok: false, message: CAST_UNAVAILABLE_MESSAGE };
  if (existing.kind === "found") return { ok: true };

  const positions = computePositions(calculationInstantForDate(isoDate));
  const events = await fetchEvents(isoDate);
  const inserted = await insertReading(anon, { event_date: isoDate, positions, events });

  if (!inserted.ok) {
    // Same classification as saveReading's (Sprint 25): only a class 22/23
    // rejection is "the data was refused"; anything else is an outage and is
    // logged in full.
    const { error, status } = inserted;
    if (isDatabaseUnavailable("insert", { error })) {
      logDatabaseUnavailable("castHoroscopeForDate (insert)", { error, status });
      return { ok: false, message: CAST_UNAVAILABLE_MESSAGE };
    }
    console.error("castHoroscopeForDate: insert failed", error);
    return { ok: false, message: CAST_SAVE_FAILED_MESSAGE };
  }

  const result = await generate(anon, inserted.id, {
    id: inserted.id,
    event_date: isoDate,
    positions,
    events,
    horoscope: null,
  });
  return result.ok ? { ok: true } : { ok: false, message: result.error };
}
