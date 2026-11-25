import type { SupabaseClient } from "@supabase/supabase-js";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import { unwritableReason } from "../events/matched";
import { fetchDayEvents, type WikipediaEventsPayload } from "../events/wikipedia";
import { generateAndPersistHoroscope, isHoroscopeEnabled } from "../llm/generate";
import { insertReading } from "../readings/insert";
import { isDatabaseUnavailable, logDatabaseUnavailable } from "../supabase/availability";
import { lookupSavedHoroscope } from "./load";
import { FUTURE_DATE_MESSAGE, isAfterToday } from "./params";

export const CAST_DISABLED_MESSAGE = "Horoscope generation is currently disabled.";
export const CAST_UNAVAILABLE_MESSAGE =
  "The horoscope can't be revealed right now because the service is unavailable. Try again in a few minutes.";
export const CAST_SAVE_FAILED_MESSAGE = "Could not start the reading, try again.";

export type CastResult = { ok: true } | { ok: false; message: string };

/**
 * R12: reads and writes on different clients. `reader` is the anon client
 * (the R4 lookup, exactly as the page does it); `writer` is the server-only
 * admin client, created by the "use server" action -- this module never
 * imports lib/supabase/admin.ts. The admin client is never used to read rows
 * back (R12d).
 */
export type CastClients = { reader: SupabaseClient; writer: SupabaseClient };

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
 *   1b. Sprint 47, R4: a date after today (UTC) -> refuse, before the
 *      lookup, the insert or any OpenAI call. The page already redirects
 *      future dates, so only a stale tab or a hand-built POST gets here.
 *   2. A horoscope is already saved for the date -> nothing to do. Replacing
 *      one is out of scope; a stale tab or a hand-built POST mustn't do it.
 *      (Two casts racing each other can still both write; R4 shows the
 *      newer, which the sprint accepts.)
 *   3. Sprint 39, R8: the events fetched here, never anything the form
 *      sent, must be from the exact year. Unmatched or failed -> refuse,
 *      before the insert, so a refused attempt writes nothing at all.
 *   4. Insert the reading -- positions and events, through insertReading
 *      (shared with the retired /chart page's save action until Sprint 31).
 *   5. Generate and persist through generateAndPersistHoroscope. If that
 *      fails the inserted row stays without a horoscope, which R4's lookup
 *      never returns.
 *
 * `isoDate` must already have passed parseDatePageParam.
 */
export async function castHoroscopeForDate(
  { reader, writer }: CastClients,
  isoDate: string,
  { fetchEvents, generate }: CastDeps = {
    fetchEvents: fetchDayEvents,
    generate: generateAndPersistHoroscope,
  }
): Promise<CastResult> {
  if (!isHoroscopeEnabled()) {
    return { ok: false, message: CAST_DISABLED_MESSAGE };
  }

  if (isAfterToday(isoDate)) return { ok: false, message: FUTURE_DATE_MESSAGE };

  const existing = await lookupSavedHoroscope(reader, isoDate, "castHoroscopeForDate (lookup)");
  if (existing.kind === "unavailable") return { ok: false, message: CAST_UNAVAILABLE_MESSAGE };
  if (existing.kind === "found") return { ok: true };

  const positions = computePositions(calculationInstantForDate(isoDate));
  const events = await fetchEvents(isoDate);
  const refusal = unwritableReason(events);
  if (refusal) return { ok: false, message: refusal };

  const inserted = await insertReading(writer, { event_date: isoDate, positions, events });

  if (!inserted.ok) {
    // The classification Sprint 25 set for inserts: only a class 22/23
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

  const result = await generate(writer, inserted.id, {
    id: inserted.id,
    event_date: isoDate,
    positions,
    events,
    horoscope: null,
  });
  return result.ok ? { ok: true } : { ok: false, message: result.error };
}
